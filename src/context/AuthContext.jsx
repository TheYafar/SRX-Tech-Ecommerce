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
// Formats the user data safely and retrieves the profile role
// ============================================================
const formatUser = async (sessionUser, previousRole = null) => {
  if (!sessionUser) {
    return null;
  }

  const metadata = sessionUser.user_metadata || {};
  const name = metadata.full_name || sessionUser.email.split('@')[0];

  // Retrieve role in priority order (database, metadata, app metadata, or default 'cliente')
  let role = previousRole || metadata.role || sessionUser.app_metadata?.role || 'cliente';

  try {
    // Timeout of 5 seconds to prevent the application from hanging infinitely
    const fetchPromise = supabase
      .from('profiles')
      .select('role')
      .eq('id', sessionUser.id)
      .maybeSingle();

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Supabase profile check timeout (5s)')), 5000);
    });

    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

    if (error) {
      console.error(`Error querying profile. Fallback to role '${role}':`, error);
    } else if (data && data.role) {
      role = data.role;
    }
  } catch (err) {
    console.error(`Exception during formatUser. Fallback to role '${role}':`, err);
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
// ============================================================
export const AuthProvider = ({ children }) => {
  const { showSuccess, showInfo, showError } = useNotifications();

  // Detects if the page was directly reloaded
  const detectarRecarga = () => {
    if (typeof window === 'undefined') return false;
    return (
      (window.performance && window.performance.navigation && window.performance.navigation.type === 1) ||
      (window.performance && window.performance.getEntriesByType && window.performance.getEntriesByType('navigation')[0] && window.performance.getEntriesByType('navigation')[0].type === 'reload')
    );
  };

  const isReloadingRef = useRef(detectarRecarga());

  // Start with clean state if it's a page reload
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(!isReloadingRef.current);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authContextHint, setAuthContextHint] = useState(null);

  const pendingActionRef = useRef(null);
  const userRef = useRef(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    let mounted = true;

    // Reset session on reload for security consistency
    const limpiarSesionAlRecargar = async () => {
      if (isReloadingRef.current) {
        try {
          await supabase.auth.signOut();
        } catch (error) {
          console.error('Error signing out on reload:', error);
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

    // Listen to authentication changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (isReloadingRef.current && session) {
          return;
        }

        if (session?.user) {
          const currentUser = userRef.current;
          const isTokenRefresh = event === 'TOKEN_REFRESHED';
          const hasMatchingUser = currentUser && currentUser.id === session.user.id;

          if (isTokenRefresh && hasMatchingUser) {
            if (mounted) {
              setIsLoading(false);
            }
            return;
          }

          const formattedUser = await formatUser(session.user, currentUser?.role);
          if (mounted) {
            setUser(formattedUser);
            setIsLoading(false);
          }
        } else {
          if (mounted) {
            setUser(null);
            setIsLoading(false);
          }
        }
      } catch (err) {
        console.error('Error inside onAuthStateChange listener:', err);
        if (mounted) {
          setIsLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  const executePendingAction = useCallback(() => {
    const action = pendingActionRef.current;
    if (typeof action === 'function') {
      pendingActionRef.current = null;
      setAuthContextHint(null);
      setTimeout(() => {
        action();
      }, 150);
    }
  }, []);

  const clearPendingAction = useCallback(() => {
    pendingActionRef.current = null;
    setAuthContextHint(null);
  }, []);

  const login = async (email, password) => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        console.error('Login error:', {
          message: error.message,
          status: error.status,
        });
        return { success: false, error: error.message };
      }

      const formattedUser = data?.user ? await formatUser(data.user, userRef.current?.role) : null;

      setIsAuthModalOpen(false);
      showSuccess('¡Bienvenido de nuevo!', 2000);
      executePendingAction();
      return { success: true, user: formattedUser };
    } catch (error) {
      console.error('Unexpected error during login:', error);
      return { success: false, error: error.message || 'Error inesperado' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name, email, password) => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
        },
      });

      if (error) {
        console.error('Registration error:', {
          message: error.message,
          status: error.status,
        });
        return { success: false, error: error.message };
      }

      const formattedUser = data?.user ? await formatUser(data.user, userRef.current?.role) : null;

      if (email) {
        sendCouponEmail(email, 'BIENVENIDA10', 10)
          .then(res => {
            if (!res.success) {
              console.warn('Welcome coupon email delivery failed:', res.error);
            }
          })
          .catch(err => {
            console.error('Welcome coupon exception:', err);
          });
      }

      setIsAuthModalOpen(false);
      showSuccess('¡Cuenta creada exitosamente!', 2000);
      executePendingAction();
      return { success: true, user: formattedUser };
    } catch (error) {
      console.error('Unexpected error during registration:', error);
      return { success: false, error: error.message || 'Error inesperado' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();

    if (!error) {
      showInfo('Sesión cerrada correctamente', 2000);
    } else {
      console.error('Logout error:', {
        message: error.message,
      });
      showError('Error al cerrar sesión', 2000);
    }
  };

  const openAuthModal = (mode = 'login') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const openAuthModalWithAction = useCallback((action, hint = null, mode = 'login') => {
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