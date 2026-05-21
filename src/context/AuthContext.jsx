import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNotifications } from './NotificationContext';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const { showSuccess, showInfo } = useNotifications();
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('srx_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'

  useEffect(() => {
    if (user) {
      localStorage.setItem('srx_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('srx_user');
    }
  }, [user]);

  const login = (email, password) => {
    // Simulación de login - en producción esto sería una llamada a API
    const mockUser = {
      id: '1',
      email,
      name: email.split('@')[0],
      avatar: `https://ui-avatars.com/api/?name=${email.split('@')[0]}&background=1e225e&color=fff`,
      createdAt: new Date().toISOString()
    };
    
    setUser(mockUser);
    setIsAuthModalOpen(false);
    
    showSuccess('¡Bienvenido de nuevo!', 2000);
    
    return { success: true, user: mockUser };
  };

  const register = (name, email, password) => {
    // Simulación de registro
    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      avatar: `https://ui-avatars.com/api/?name=${name}&background=1e225e&color=fff`,
      createdAt: new Date().toISOString()
    };
    
    setUser(newUser);
    setIsAuthModalOpen(false);
    
    showSuccess('¡Cuenta creada exitosamente!', 2000);
    
    return { success: true, user: newUser };
  };

  const logout = () => {
    setUser(null);
    showInfo('Sesión cerrada correctamente', 2000);
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