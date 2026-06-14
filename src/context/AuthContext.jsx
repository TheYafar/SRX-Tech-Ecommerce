/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useNotifications } from './NotificationContext';
import { supabase } from '../utils/supabaseClient';
import { sendCouponEmail } from '../services/emailService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ============================================================
// CAVERNICOLA FORMAT USER — SAFE, TOLERANT, NO CRASH
// Uses maybeSingle() so it no scream if profile row no exist
// Default role = previous role, metadata role, or 'cliente'
// ============================================================
const formatUser = async (sessionUser, previousRole = null) => {
  if (!sessionUser) {
    console.log('ℹ️ [AuthContext:formatUser] sessionUser es nulo. Retornando null.');
    return null;
  }

  const metadata = sessionUser.user_metadata || {};
  const name = metadata.full_name || sessionUser.email.split('@')[0];

  // MONO INTELIGENTE: busca rol en orden de prioridad para persistencia/anti-downgrade
  let role = previousRole || metadata.role || sessionUser.app_metadata?.role || 'cliente';

  try {
    console.log(`🔍 [AuthContext:formatUser] Consultando rol para ID: ${sessionUser.id}`);
    
    // MONO PONE TIMEOUT DE SEGURIDAD (5s) PARA QUE LA APP NUNCA SE QUEDE CARGANDO ETERNAMENTE
    // Si expira o falla, mantenemos rol (admin sigue siendo admin). ¡Unga unga!
    const fetchPromise = supabase
      .from('profiles')
      .select('role')
      .eq('id', sessionUser.id)
      .maybeSingle(); // maybeSingle = no throw if row no exist. GOOD ROCK!

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout de consulta en Supabase (5s)')), 5000);
    });

    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

    if (error) {
      console.error(`⚠️ [AuthContext:formatUser] Error en consulta de profiles. Manteniendo rol anterior/metadata '${role}':`, error);
    } else if (data && data.role) {
      role = data.role;
      console.log(`✅ [AuthContext:formatUser] Rol obtenido de base de datos: ${role} para ${sessionUser.email}`);
    } else {
      console.log(`ℹ️ [AuthContext:formatUser] Sin fila de perfil para ID ${sessionUser.id}. Manteniendo '${role}'`);
    }
  } catch (err) {
    console.error(`💥 [AuthContext:formatUser] Excepción/Timeout (red u otra). Manteniendo rol anterior/metadata '${role}':`, err);
  }

  return {
    id: sessionUser.id,
    email: sessionUser.email,
    name: name,
    avatar:
      metadata.avatar_url ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1e225e&color=fff`,
    role: role,
    createdAt: sessionUser.created_at,
  };
};

// ============================================================
// AUTH PROVIDER — SINGLE SOURCE OF TRUTH ARCHITECTURE
// onAuthStateChange = ONE BOSS. Only it calls formatUser & setUser.
// login/register = only throw credentials at Supabase. That's it.
// No isManualAuthAction ref. No deadlock. No race condition.
// CAVERNICOLA SMASH BUG! 🪨
// ============================================================
export const AuthProvider = ({ children }) => {
  const { showSuccess, showInfo, showError } = useNotifications();

  // MONO SÚPER SEGURO: Detecta si venimos de F5 / recarga de página directo
  const detectarRecarga = () => {
    if (typeof window === 'undefined') return false;
    return (
      (window.performance && window.performance.navigation && window.performance.navigation.type === 1) ||
      (window.performance && window.performance.getEntriesByType && window.performance.getEntriesByType('navigation')[0] && window.performance.getEntriesByType('navigation')[0].type === 'reload')
    );
  };

  const isReloadingRef = useRef(detectarRecarga());

  // Si es recarga, arranca limpio sin cargar nada (user = null, isLoading = false) ¡Uh uh ah ah!
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(!isReloadingRef.current);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [authContextHint, setAuthContextHint] = useState(null); // Mensaje de contexto en la modal

  // REF para la acción pendiente — no dispara re-render, persiste entre renders
  const pendingActionRef = useRef(null);

  // MONO USAR REF PARA TENER ROL ACTUAL SIEMPRE FRESCO Y EVITAR CORRUPCIÓN POR CLOSURE
  const userRef = useRef(null);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    // Memory safety flag — cavernicola no update dead cave!
    let mounted = true;

    // 🐒 MONO SEGURO HACE SIGN OUT SI ES RECARGA (F5) ¡PUM CACAO!
    const limpiarSesionAlRecargar = async () => {
      if (isReloadingRef.current) {
        console.log('🐒 [AuthContext] ¡UH UH AH AH! ¡Detectada recarga de página (F5)! Borrando sesión por seguridad...');
        try {
          await supabase.auth.signOut();
        } catch (error) {
          console.error('❌ [AuthContext] Error al limpiar sesión en recarga:', error);
        } finally {
          isReloadingRef.current = false;
          if (mounted) {
            setUser(null);
            setIsLoading(false);
          }
        }
      }
    };

    limpiarSesionAlRecargar();

    console.log('🏔️ [AuthContext] Iniciando listener onAuthStateChange (ÚNICA fuente de verdad)...');

    // THE ONE BOSS LISTENER — handles ALL auth state changes:
    // initial session load, login, register, logout, token refresh
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        console.log(`🔔 [AuthContext:onAuthStateChange] Evento: ${event}`, session ? `Usuario: ${session.user.email}` : 'Sin sesión');

        // MONO SEGURIDAD: Si está limpiando por recarga, ignora sesión activa temporal
        if (isReloadingRef.current && session) {
          console.log('🐒 [AuthContext:onAuthStateChange] Ignorando sesión inicial por recarga en progreso...');
          return;
        }

        if (session?.user) {
          const currentUser = userRef.current;
          const isTokenRefresh = event === 'TOKEN_REFRESHED';
          const hasMatchingUser = currentUser && currentUser.id === session.user.id;

          // MONO OPTIMIZAR REFRESH: Si es refresco de token y ya hay perfil en local, ¡no molestar a base de datos!
          if (isTokenRefresh && hasMatchingUser) {
            console.log('⚡ [AuthContext:onAuthStateChange] Refresco de token. Reusando perfil actual sin consulta redundante.');
            if (mounted) {
              setIsLoading(false);
            }
            return;
          }

          const formattedUser = await formatUser(session.user, currentUser?.role);
          // Only update state if component still alive (memory safety!)
          if (mounted) {
            setUser(formattedUser);
            setIsLoading(false);
            console.log('✅ [AuthContext:onAuthStateChange] Estado de usuario actualizado:', formattedUser);
          }
        } else {
          if (mounted) {
            setUser(null);
            setIsLoading(false);
            console.log('ℹ️ [AuthContext:onAuthStateChange] Sin sesión activa. user = null.');
          }
        }
      } catch (err) {
        console.error('💥 [AuthContext:onAuthStateChange] Error en listener de auth:', err);
        if (mounted) {
          setIsLoading(false);
        }
      }
    });

    // Cleanup — unsubscribe when cave collapses
    return () => {
      mounted = false;
      console.log('🧹 [AuthContext] Limpiando listener onAuthStateChange.');
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // ▶️ [AuthContext] Ejecutar la acción pendiente guardada (si existe) y limpiarla
  const executePendingAction = useCallback(() => {
    const action = pendingActionRef.current;
    if (typeof action === 'function') {
      console.log('▶️ [AuthContext:executePendingAction] Ejecutando acción pendiente post-auth...');
      pendingActionRef.current = null;
      setAuthContextHint(null);
      // Pequeño delay para que el modal se cierre antes de ejecutar
      setTimeout(() => {
        action();
      }, 150);
    }
  }, []);

  const clearPendingAction = useCallback(() => {
    pendingActionRef.current = null;
    setAuthContextHint(null);
  }, []);

  // ----------------------------------------------------------
  // LOGIN — Only sends credentials. THAT'S IT.
  // Listener above will handle formatUser + setUser automatically.
  // ----------------------------------------------------------
  const login = async (email, password) => {
    setIsLoading(true); // 🦴 GRONK PONER CARGANDO TRUE AL INICIO DE LOGIN!
    console.log(`🔑 [AuthContext:login] Enviando credenciales a Supabase para: ${email}`);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        console.error('❌ [AuthContext:login] Error de autenticación:', {
          message: error.message,
          status: error.status,
        });
        return { success: false, error: error.message };
      }

      // MONO PASAR ROL PREVIO POR SI FALLA CONSULTA
      const formattedUser = data?.user ? await formatUser(data.user, userRef.current?.role) : null;

      // SUCCESS — onAuthStateChange listener will do the rest!
      console.log('✅ [AuthContext:login] Credenciales aceptadas. Listener actualizará el estado.');
      setIsAuthModalOpen(false);
      showSuccess('¡Bienvenido de nuevo!', 2000);
      // 🔗 CONTINUIDAD: ejecutar acción pendiente (si existe) después del login
      executePendingAction();
      return { success: true, user: formattedUser };
    } catch (error) {
      console.error('💥 [AuthContext:login] Error inesperado en login:', error);
      return { success: false, error: error.message || 'Error inesperado' };
    } finally {
      setIsLoading(false); // 🦴 GRONK APAGAR CARGANDO SIEMPRE, PASE LO QUE PASE!
    }
  };

  // ----------------------------------------------------------
  // REGISTER — Only sends credentials. THAT'S IT.
  // Listener above will handle formatUser + setUser automatically.
  // ----------------------------------------------------------
  const register = async (name, email, password) => {
    setIsLoading(true); // 🦴 GRONK PONER CARGANDO TRUE AL INICIO DE REGISTRO!
    console.log(`📝 [AuthContext:register] Enviando datos de registro a Supabase para: ${email} (${name})`);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
        },
      });

      if (error) {
        console.error('❌ [AuthContext:register] Error de registro:', {
          message: error.message,
          status: error.status,
        });
        return { success: false, error: error.message };
      }

      // MONO PASAR ROL PREVIO POR SI FALLA CONSULTA
      const formattedUser = data?.user ? await formatUser(data.user, userRef.current?.role) : null;

      // 🐒 MONO DISPARA CUPÓN DE BIENVENIDA A NUEVO CLIENTE (en segundo plano)
      if (email) {
        sendCouponEmail(email, 'BIENVENIDA10', 10)
          .then(res => {
            if (res.success) {
              console.log(`📧 [AuthContext:register] ¡Uh uh! Cupón de bienvenida enviado con éxito a: ${email}`);
            } else {
              console.warn('⚠️ [AuthContext:register] El correo de bienvenida falló:', res.error);
            }
          })
          .catch(err => {
            console.error('💥 [AuthContext:register] Excepción de correo de bienvenida:', err);
          });
      }

      // SUCCESS — onAuthStateChange listener will do the rest!
      console.log('✅ [AuthContext:register] Registro aceptado. Listener actualizará el estado.');
      setIsAuthModalOpen(false);
      showSuccess('¡Cuenta creada exitosamente!', 2000);
      // 🔗 CONTINUIDAD: ejecutar acción pendiente (si existe) después del registro
      executePendingAction();
      return { success: true, user: formattedUser };
    } catch (error) {
      console.error('💥 [AuthContext:register] Error inesperado en registro:', error);
      return { success: false, error: error.message || 'Error inesperado' };
    } finally {
      setIsLoading(false); // 🦴 GRONK APAGAR CARGANDO SIEMPRE!
    }
  };

  // ----------------------------------------------------------
  // LOGOUT — signOut triggers onAuthStateChange with null session
  // Listener sets user = null automatically. No manual setUser needed.
  // ----------------------------------------------------------
  const logout = async () => {
    console.log('🚪 [AuthContext:logout] Cerrando sesión...');
    const { error } = await supabase.auth.signOut();

    if (!error) {
      console.log('✅ [AuthContext:logout] Sesión cerrada. Listener limpiará el estado.');
      showInfo('Sesión cerrada correctamente', 2000);
    } else {
      console.error('❌ [AuthContext:logout] Error al cerrar sesión:', {
        message: error.message,
      });
      showError('Error al cerrar sesión', 2000);
    }
  };

  const openAuthModal = (mode = 'login') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  // 🔐 [AuthContext] Abrir modal con acción pendiente para continuidad de flujo post-auth
  const openAuthModalWithAction = useCallback((action, hint = null, mode = 'login') => {
    console.log('🔐 [AuthContext:openAuthModalWithAction] Guardando acción pendiente para ejecutar post-auth.');
    pendingActionRef.current = action;
    setAuthContextHint(hint);
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    clearPendingAction();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthModalOpen,
        authMode,
        authContextHint,
        login,
        register,
        logout,
        openAuthModal,
        openAuthModalWithAction,
        closeAuthModal,
        executePendingAction,
        clearPendingAction,
        setAuthMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};