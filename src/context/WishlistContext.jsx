/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useNotifications } from './NotificationContext';
import { supabase } from '../utils/supabaseClient';

const WishlistContext = createContext();

// ─── Claves de localStorage ──────────────────────────────────────────
const ANON_KEY = 'srx_wishlist_anon';
// La clave 'srx_wishlist' ya no se usa para anónimos; se conserva solo
// para migración de datos de versiones anteriores.

// ─── Helpers de Supabase (tabla public.favorites) ────────────────────
async function fetchUserFavorites(userId) {
  const { data, error } = await supabase
    .from('favorites')
    .select('product_id')
    .eq('user_id', userId);

  if (error) {
    console.error('[WishlistContext] Error al obtener favoritos del usuario:', error);
    return [];
  }
  // La tabla solo guarda product_id; devolvemos objetos mínimos con id
  return data.map((row) => ({ id: row.product_id }));
}

async function addFavoriteToDb(userId, product) {
  const { error } = await supabase
    .from('favorites')
    .upsert(
      { user_id: userId, product_id: product.id },
      { onConflict: 'user_id,product_id', ignoreDuplicates: true }
    );
  if (error) {
    console.error('[WishlistContext] Error al agregar favorito a BD:', error);
  }
}

async function removeFavoriteFromDb(userId, productId) {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId);
  if (error) {
    console.error('[WishlistContext] Error al eliminar favorito de BD:', error);
  }
}

// ─── Leer / guardar favoritos anónimos en localStorage ───────────────
function loadAnonFavorites() {
  try {
    // Migrar datos de la clave antigua si existen
    const legacy = localStorage.getItem('srx_wishlist');
    if (legacy) {
      localStorage.setItem(ANON_KEY, legacy);
      localStorage.removeItem('srx_wishlist');
    }
    const saved = localStorage.getItem(ANON_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveAnonFavorites(items) {
  try {
    localStorage.setItem(ANON_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('[WishlistContext] No se pudo guardar favoritos anónimos:', e);
  }
}

// ─────────────────────────────────────────────────────────────────────
export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

export const WishlistProvider = ({ children }) => {
  const { showSuccess, showInfo } = useNotifications();

  // currentUserId se obtiene del evento srx-login / srx-logout
  // (no dependemos directamente de useAuth para evitar acoplamiento circular)
  const [currentUserId, setCurrentUserId] = useState(null);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Referencia para tener siempre el userId actualizado en event listeners
  const userIdRef = useRef(null);
  useEffect(() => {
    userIdRef.current = currentUserId;
  }, [currentUserId]);

  // ─── INICIALIZACIÓN: restaurar sesión ya existente al montar ───────
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        setCurrentUserId(session.user.id);
        const items = await fetchUserFavorites(session.user.id);
        if (mounted) setWishlistItems(items);
      } else {
        // Cargar favoritos anónimos si no hay sesión
        setWishlistItems(loadAnonFavorites());
      }
    });

    return () => { mounted = false; };
  }, []);

  // ─── EVENTO srx-login: migrar favoritos anónimos → BD ─────────────
  useEffect(() => {
    const handleLogin = async (e) => {
      const userId = e.detail?.userId;
      if (!userId) return;

      setCurrentUserId(userId);
      setIsSyncing(true);

      try {
        // 1. Cargar favoritos ya guardados en la cuenta
        const dbFavorites = await fetchUserFavorites(userId);

        // 2. Leer favoritos anónimos pendientes
        const anonFavorites = loadAnonFavorites();

        // 3. Merge: agregar a BD solo los que NO están ya guardados
        const dbIds = new Set(dbFavorites.map((p) => p.id));
        const newItems = anonFavorites.filter((p) => !dbIds.has(p.id));

        await Promise.all(newItems.map((p) => addFavoriteToDb(userId, p)));

        // 4. Estado final = unión de ambos conjuntos
        const merged = [...dbFavorites, ...newItems];
        setWishlistItems(merged);

        // 5. Limpiar almacenamiento anónimo
        localStorage.removeItem(ANON_KEY);
        localStorage.removeItem('srx_wishlist'); // limpieza de clave legacy
      } catch (err) {
        console.error('[WishlistContext] Error al migrar favoritos en login:', err);
      } finally {
        setIsSyncing(false);
      }
    };

    window.addEventListener('srx-login', handleLogin);
    return () => window.removeEventListener('srx-login', handleLogin);
  }, []);

  // ─── EVENTO srx-logout: vaciar estado inmediatamente ──────────────
  useEffect(() => {
    const handleLogout = () => {
      setCurrentUserId(null);
      setWishlistItems([]); // La lista queda vacía en pantalla de inmediato
      // localStorage ya fue limpiado por AuthContext
    };

    window.addEventListener('srx-logout', handleLogout);
    return () => window.removeEventListener('srx-logout', handleLogout);
  }, []);

  // ─── Persistir favoritos anónimos en localStorage ─────────────────
  // Solo se ejecuta cuando NO hay usuario autenticado
  useEffect(() => {
    if (!currentUserId) {
      saveAnonFavorites(wishlistItems);
    }
  }, [wishlistItems, currentUserId]);

  // ─── API pública ──────────────────────────────────────────────────
  const isProductLiked = useCallback(
    (productId) => wishlistItems.some((item) => item.id === productId),
    [wishlistItems]
  );

  const addToWishlist = useCallback(
    async (product) => {
      const userId = userIdRef.current;

      setWishlistItems((prev) => {
        if (prev.some((item) => item.id === product.id)) return prev;
        return [...prev, product];
      });
      showSuccess(`"${product.name || product.title}" añadido a tus favoritos`, 2000);

      if (userId) {
        await addFavoriteToDb(userId, product);
      }
    },
    [showSuccess]
  );

  const removeFromWishlist = useCallback(
    async (productId) => {
      const userId = userIdRef.current;

      setWishlistItems((prev) => {
        const product = prev.find((item) => item.id === productId);
        if (product) {
          showInfo(`"${product.name || product.title}" eliminado de tus favoritos`, 2000);
        }
        return prev.filter((item) => item.id !== productId);
      });

      if (userId) {
        await removeFavoriteFromDb(userId, productId);
      }
    },
    [showInfo]
  );

  const toggleWishlist = useCallback(
    (product) => {
      if (isProductLiked(product.id)) {
        removeFromWishlist(product.id);
      } else {
        addToWishlist(product);
      }
    },
    [isProductLiked, addToWishlist, removeFromWishlist]
  );

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        isProductLiked,
        isSyncing,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};
