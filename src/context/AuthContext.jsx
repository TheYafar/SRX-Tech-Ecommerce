import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNotifications } from './NotificationContext';
import { supabase } from '../utils/supabaseClient';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Función auxiliar para mapear el usuario de Supabase a las propiedades de UI esperadas
const formatUser = (sessionUser) => {
  if (!sessionUser) return null;
  const metadata = sessionUser.user_metadata || {};
  const name = metadata.full_name || sessionUser.email.split('@')[0];
  return {
    id: sessionUser.id,
    email: sessionUser.email,
    name: name,
    avatar: metadata.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1e225e&color=fff`,
    createdAt: sessionUser.created_at
  };
};

export const AuthProvider = ({ children }) => {
  const { showSuccess, showInfo, showError } = useNotifications();
  const [user, setUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'

  useEffect(() => {
    // Obtener la sesión inicial
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(formatUser(session.user));
      }
    };

    initSession();

    // Suscribirse a cambios en la autenticación
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(formatUser(session.user));
      } else {
        setUser(null);
      }
    });

    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    setIsAuthModalOpen(false);
    showSuccess('¡Bienvenido de nuevo!', 2000);
    return { success: true, user: formatUser(data.user) };
  };

  const register = async (name, email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name
        }
      }
    });

    if (error) {
      return { success: false, error: error.message };
    }

    setIsAuthModalOpen(false);
    showSuccess('¡Cuenta creada exitosamente!', 2000);
    return { success: true, user: formatUser(data.user) };
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      showInfo('Sesión cerrada correctamente', 2000);
    } else {
      showError('Error al cerrar sesión', 2000);
    }
  };

  const openAuthModal = (mode = 'login') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthModalOpen,
        authMode,
        login,
        register,
        logout,
        openAuthModal,
        closeAuthModal,
        setAuthMode
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};