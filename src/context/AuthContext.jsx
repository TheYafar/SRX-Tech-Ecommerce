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

// ============================================================
// CAVERNICOLA FORMAT USER — SAFE, TOLERANT, NO CRASH
// Uses maybeSingle() so it no scream if profile row no exist
// Default role = 'cliente' if anything go wrong
// ============================================================
const formatUser = async (sessionUser) => {
  if (!sessionUser) {
    console.log('ℹ️ [AuthContext:formatUser] sessionUser es nulo. Retornando null.');
    return null;
  }

  const metadata = sessionUser.user_metadata || {};
  const name = metadata.full_name || sessionUser.email.split('@')[0];

  // Default role — cavernicola use club, we use 'cliente'
  let role = 'cliente';

  try {
    console.log(`🔍 [AuthContext:formatUser] Consultando rol para ID: ${sessionUser.id}`);
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', sessionUser.id)
      .maybeSingle(); // maybeSingle = no throw if row no exist. GOOD ROCK!

    if (error) {
      console.warn("⚠️ [AuthContext:formatUser] Error consultando profiles. Usando rol por defecto 'cliente':", {
        message: error.message,
        code: error.code,
        hint: error.hint,
      });
      // role stays 'cliente' — cavernicola fallback!
    } else if (data && data.role) {
      role = data.role;
      console.log(`✅ [AuthContext:formatUser] Rol obtenido: ${role} para ${sessionUser.email}`);
    } else {
      console.log(`ℹ️ [AuthContext:formatUser] Sin fila de perfil para ID ${sessionUser.id}. Rol por defecto: 'cliente'`);
    }
  } catch (err) {
    // Try/catch = cavernicola safety net. App no freeze!
    console.error('💥 [AuthContext:formatUser] Excepción inesperada. Usando rol por defecto:', err);
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
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'

  useEffect(() => {
    // Memory safety flag — cavernicola no update dead cave!
    let mounted = true;

    console.log('🏔️ [AuthContext] Iniciando listener onAuthStateChange (ÚNICA fuente de verdad)...');

    // THE ONE BOSS LISTENER — handles ALL auth state changes:
    // initial session load, login, register, logout, token refresh
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`🔔 [AuthContext:onAuthStateChange] Evento: ${event}`, session ? `Usuario: ${session.user.email}` : 'Sin sesión');

      if (session?.user) {
        const formattedUser = await formatUser(session.user);
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

  // ----------------------------------------------------------
  // LOGIN — Only sends credentials. THAT'S IT.
  // Listener above will handle formatUser + setUser automatically.
  // ----------------------------------------------------------
  const login = async (email, password) => {
    console.log(`🔑 [AuthContext:login] Enviando credenciales a Supabase para: ${email}`);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.error('❌ [AuthContext:login] Error de autenticación:', {
        message: error.message,
        status: error.status,
      });
      return { success: false, error: error.message };
    }

    const formattedUser = data?.user ? await formatUser(data.user) : null;

    // SUCCESS — onAuthStateChange listener will do the rest!
    console.log('✅ [AuthContext:login] Credenciales aceptadas. Listener actualizará el estado.');
    setIsAuthModalOpen(false);
    showSuccess('¡Bienvenido de nuevo!', 2000);
    return { success: true, user: formattedUser };
  };

  // ----------------------------------------------------------
  // REGISTER — Only sends credentials. THAT'S IT.
  // Listener above will handle formatUser + setUser automatically.
  // ----------------------------------------------------------
  const register = async (name, email, password) => {
    console.log(`📝 [AuthContext:register] Enviando datos de registro a Supabase para: ${email} (${name})`);

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

    const formattedUser = data?.user ? await formatUser(data.user) : null;

    // SUCCESS — onAuthStateChange listener will do the rest!
    console.log('✅ [AuthContext:register] Registro aceptado. Listener actualizará el estado.');
    setIsAuthModalOpen(false);
    showSuccess('¡Cuenta creada exitosamente!', 2000);
    return { success: true, user: formattedUser };
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

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthModalOpen,
        authMode,
        login,
        register,
        logout,
        openAuthModal,
        closeAuthModal,
        setAuthMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};