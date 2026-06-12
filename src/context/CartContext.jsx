/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useNotifications } from './NotificationContext';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

// ============================================================
// HELPER: genera la clave de localStorage SOLO para usuarios
// autenticados. Los invitados NO tienen clave — punto. 🐒🍌
// ============================================================
const getCartStorageKey = (user) => {
  return user ? `srx_cart_${user.id}` : null;
};

const getOrdersStorageKey = (user) => {
  return user ? `srx_orders_${user.id}` : null;
};

// ============================================================
// HELPER: carga segura del carrito desde localStorage
// Si la clave es null (invitado) → devuelve [] sin tocar storage
// ============================================================
const loadCartFromStorage = (key) => {
  if (!key) return [];
  try {
    const savedCart = localStorage.getItem(key);
    return savedCart ? JSON.parse(savedCart) : [];
  } catch (err) {
    console.error(`🐒 [CartContext] Error leyendo localStorage key "${key}":`, err);
    return [];
  }
};

// ============================================================
// HELPER: limpia cualquier rastro de carrito de invitado viejo
// Por si quedó basura de una versión anterior del código 🧹🐒
// ============================================================
const cleanGuestCartArtifacts = () => {
  try {
    localStorage.removeItem('srx_cart_guest');
    localStorage.removeItem('srx_orders_guest');
  } catch (err) {
    console.error('🐒 [CartContext] Error limpiando artefactos de invitado:', err);
  }
};

// ============================================================
// CART PROVIDER — PERSISTENCIA CONDICIONAL 🐒💎
//
// REGLAS DE ORO:
// 1. Invitado (sin sesión) → carrito SIEMPRE vacío al recargar.
//    NUNCA se guarda ni se lee de localStorage.
// 2. Usuario autenticado → carrito se persiste bajo su ID único
//    (srx_cart_{userId}) y se recupera al recargar.
// 3. Al cerrar sesión → carrito se limpia inmediatamente a [].
// 4. Al iniciar sesión → carrito se carga desde la clave del user.
// ============================================================
export const CartProvider = ({ children }) => {
  const { showSuccess } = useNotifications();
  const { user, isLoading: isAuthLoading } = useAuth();

  // REF para trackear el userId previo y evitar re-cargas innecesarias
  const prevUserIdRef = useRef(undefined); // undefined = aún no inicializado
  const isInitialLoadRef = useRef(true);

  // Estado del carrito — arranca vacío, se llena SOLO si hay sesión activa
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // ==============================================================
  // EFFECT 1: CARGA / SWAP / LIMPIEZA según estado de autenticación
  //
  // Se ejecuta cuando:
  // - Auth termina de cargar (isAuthLoading pasa a false)
  // - El user cambia (login, logout, switch de cuenta)
  //
  // Lógica:
  // 1. Si auth sigue cargando → no hacer nada, carrito queda en []
  // 2. Si NO hay usuario → carrito = [] (invitado, sin persistencia)
  // 3. Si HAY usuario → cargar carrito desde su clave única
  // 4. Si el userId no cambió → no recargar (optimización)
  // ==============================================================
  useEffect(() => {
    // 🐒 Esperar a que Supabase resuelva la sesión antes de tocar el carrito
    if (isAuthLoading) {
      console.log('⏳ [CartContext] Auth todavía cargando. Mono espera pacientemente...');
      return;
    }

    // Limpiar basura de versiones anteriores que guardaban carrito de guest
    cleanGuestCartArtifacts();

    const currentUserId = user?.id || null;
    const prevUserId = prevUserIdRef.current;

    // Si el userId no cambió (y no es la carga inicial), no recargar
    if (!isInitialLoadRef.current && currentUserId === prevUserId) {
      return;
    }

    // Marcar que ya no es carga inicial
    isInitialLoadRef.current = false;
    prevUserIdRef.current = currentUserId;

    // ============================================================
    // DECISIÓN CENTRAL: ¿HAY SESIÓN O NO?
    // ============================================================
    if (!user) {
      // 🐒 INVITADO → carrito vacío, sin excepciones
      console.log('🐒 [CartContext] Invitado detectado → carrito limpio []');
      setCartItems([]);
      return;
    }

    // 🐒 USUARIO AUTENTICADO → cargar su carrito personal
    const storageKey = getCartStorageKey(user);
    const loadedCart = loadCartFromStorage(storageKey);

    console.log(
      `🐒 [CartContext] Usuario ${currentUserId} → ` +
      `Cargando carrito desde "${storageKey}" (${loadedCart.length} items)`
    );

    setCartItems(loadedCart);
  }, [user, isAuthLoading]);

  // ==============================================================
  // EFFECT 2: PERSISTENCIA CONDICIONAL
  //
  // Guarda el carrito en localStorage SOLO si hay un usuario
  // autenticado. Los invitados NUNCA persisten datos.
  //
  // IMPORTANTE: NO guardar si auth sigue cargando o si es la
  // carga inicial (para evitar sobreescribir con array vacío)
  // ==============================================================
  const hasHydratedRef = useRef(false);

  useEffect(() => {
    // No persistir mientras auth resuelve — evita guardar [] encima del carrito real
    if (isAuthLoading) return;

    // No persistir hasta que hayamos hecho al menos una carga desde storage
    if (!hasHydratedRef.current) {
      hasHydratedRef.current = true;
      return;
    }

    // ============================================================
    // CONDICIONAL ESTRICTO: solo guardar si hay usuario autenticado
    // ============================================================
    if (!user) {
      // 🐒 Invitado → NO guardar NADA. Limpiar por si acaso.
      console.log('🐒 [CartContext] Invitado → NO se persiste el carrito en localStorage');
      cleanGuestCartArtifacts();
      return;
    }

    // 🐒 Usuario autenticado → guardar bajo su clave única
    const storageKey = getCartStorageKey(user);
    try {
      localStorage.setItem(storageKey, JSON.stringify(cartItems));
    } catch (err) {
      console.error(`🐒 [CartContext] Error guardando en localStorage key "${storageKey}":`, err);
    }
  }, [cartItems, user, isAuthLoading]);

  // Resetear hydration flag cuando cambia el usuario (nuevo ciclo de carga)
  useEffect(() => {
    hasHydratedRef.current = false;
  }, [user?.id]);

  // ==============================================================
  // ACCIONES DEL CARRITO — misma API pública, sin cambios 🐒🍌
  // ==============================================================
  const addToCart = useCallback((product) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === product.id);
      if (existingItem) {
        return prevItems.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevItems, { ...product, quantity: 1 }];
    });
    // Auto-open cart when adding an item
    setIsCartOpen(true);

    showSuccess(`"${product.name || product.title}" añadido al carrito`, 2000);
  }, [showSuccess]);

  const removeFromCart = useCallback((productId) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  const cartTotal = cartItems.reduce((total, item) => {
    const activePrice = item.salePrice || item.price;
    return total + activePrice * item.quantity;
  }, 0);

  const checkout = useCallback((paymentMethod, userEmail) => {
    const orderId = 'SRX-' + Math.floor(100000 + Math.random() * 900000);

    const newOrder = {
      id: orderId,
      userEmail: userEmail || user?.email || 'invitado@srx.tech',
      date: new Date().toISOString(),
      items: [...cartItems],
      paymentMethod,
      total: cartTotal
    };

    // Save to order history — SOLO si hay usuario autenticado 🐒
    const ordersKey = getOrdersStorageKey(user);
    if (ordersKey) {
      try {
        const savedOrders = localStorage.getItem(ordersKey);
        const ordersList = savedOrders ? JSON.parse(savedOrders) : [];
        ordersList.push(newOrder);
        localStorage.setItem(ordersKey, JSON.stringify(ordersList));
      } catch (err) {
        console.error(`🐒 [CartContext] Error guardando orden en "${ordersKey}":`, err);
      }
    }

    return orderId;
  }, [cartItems, cartTotal, user]);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        cartTotal,
        checkout
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
