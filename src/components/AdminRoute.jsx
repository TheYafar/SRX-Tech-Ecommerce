import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

export default function AdminRoute({ children }) {
  const { user, isLoading } = useAuth();
  const { showError } = useNotifications();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        showError('Debes iniciar sesión para acceder al panel de administración.', 3000);
        navigate('/', { replace: true });
      } else if (user.role !== 'admin') {
        showError('Acceso denegado. No tienes permisos de administrador.', 3000);
        navigate('/', { replace: true });
      }
    }
  }, [user, isLoading, showError, navigate]);

  // Mostrar spinner mientras carga o si no cumple las condiciones (para evitar flash de contenido antes del redirect)
  if (isLoading || !user || user.role !== 'admin') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="loading-spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary-color)', borderRadius: '50%', animation: 'spin 1s ease-in-out infinite' }}></div>
      </div>
    );
  }

  return children;
}
