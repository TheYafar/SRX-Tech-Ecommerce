import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { X, Mail, Lock, User, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { loginSchema, registerSchema } from '../utils/validation';
import './AuthModal.css';

export default function AuthModal() {
  const { isAuthModalOpen, authMode, closeAuthModal, login, register, setAuthMode, authContextHint } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // 🦴 GRONK RENOMBRA: evita shadow con context isLoading
  const [authError, setAuthError] = useState('');

  const isLogin = authMode === 'login';
  const schema = isLogin ? loginSchema : registerSchema;

  const { register: formRegister, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(schema)
  });

  const onSubmit = async (data) => {
    setIsSubmitting(true); // 🦴 GRONK START SPINNER
    setAuthError('');
    console.log(`🦴 [AuthModal:onSubmit] Iniciando submit. Modo: ${authMode}`);

    try {
      if (isLogin) {
        console.log(`🔑 [AuthModal:onSubmit] Llamando login() para: ${data.email}`);
        const result = await login(data.email, data.password);
        console.log(`📊 [AuthModal:onSubmit] Resultado de login():`, result);

        if (!result.success) {
          // 🦴 LOGIN FALLIDO → MOSTRAR ERROR
          setAuthError(result.error === 'Invalid login credentials' ? 'Credenciales inválidas' : result.error);
        } else if (result.user?.role === 'admin') {
          // 🦴 ADMIN → REDIRIGIR
          console.log(`👑 [AuthModal:onSubmit] Usuario admin detectado. Redirigiendo a /admin...`);
          closeAuthModal();
          navigate('/admin');
        } else {
          // 🦴 CLIENTE NORMAL → CERRAR MODAL EXPLÍCITAMENTE (el context ya lo hizo, pero doble seguro)
          console.log(`✅ [AuthModal:onSubmit] Login exitoso para cliente '${result.user?.role}'. Cerrando modal.`);
          closeAuthModal();
        }
      } else {
        console.log(`📝 [AuthModal:onSubmit] Llamando register() para: ${data.email}`);
        const result = await register(data.name, data.email, data.password);
        console.log(`📊 [AuthModal:onSubmit] Resultado de register():`, result);

        if (!result.success) {
          setAuthError(result.error || 'Error al registrar usuario');
        } else {
          // 🦴 REGISTRO EXITOSO → CERRAR MODAL
          console.log(`✅ [AuthModal:onSubmit] Registro exitoso. Cerrando modal.`);
          closeAuthModal();
        }
      }
    } catch (error) {
      // 🦴 ERROR INESPERADO → MOSTRAR MENSAJE
      console.error(`💥 [AuthModal:onSubmit] Excepción inesperada en submit:`, error);
      setAuthError('Error inesperado en la autenticación. Intenta de nuevo.');
    } finally {
      // 🦴 GRONK GARANTIZA: SPINNER SIEMPRE SE DETIENE. SIEMPRE. PASE LO QUE PASE.
      console.log(`🏁 [AuthModal:onSubmit] Finally ejecutado → setIsSubmitting(false)`);
      setIsSubmitting(false);
    }
  };

  const switchMode = () => {
    setAuthMode(isLogin ? 'register' : 'login');
    reset();
    setAuthError('');
  };

  if (!isAuthModalOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="auth-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeAuthModal}
      >
        <motion.div
          className="auth-modal-container"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="auth-modal-header">
            <div className="auth-header-content">
              <div className="auth-logo">
                <span className="auth-logo-srx">SRX</span>
                <span className="auth-logo-divider">|</span>
                <span className="auth-logo-tech">Tech</span>
              </div>
              <h2 className="auth-title">
                {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </h2>
              <p className="auth-subtitle">
                {isLogin 
                  ? 'Accede a tu cuenta para continuar' 
                  : 'Únete a SRX Tech para una experiencia personalizada'}
              </p>
            </div>
            <button 
              className="auth-close-btn" 
              onClick={closeAuthModal}
              aria-label="Cerrar modal"
            >
              <X size={20} />
            </button>
          </div>

          {/* Banner de Continuidad — se muestra cuando hay un hint de contexto de acción pendiente */}
          {authContextHint && (
            <div className="auth-context-banner">
              <div className="auth-context-icon">
                <Lock size={16} />
              </div>
              <p className="auth-context-text">{authContextHint}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
            {authError && (
              <motion.div 
                className="auth-error-message"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {authError}
              </motion.div>
            )}

            {!isLogin && (
              <div className="form-group">
                <div className="input-with-icon">
                  <User size={18} className="input-icon" />
                  <input
                    type="text"
                    placeholder="Juan Pérez"
                    {...formRegister('name')}
                    className={`form-input ${errors.name ? 'error' : ''}`}
                  />
                </div>
                {errors.name && (
                  <span className="error-message">{errors.name.message}</span>
                )}
              </div>
            )}

            <div className="form-group">
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  placeholder="ejemplo@correo.com"
                  {...formRegister('email')}
                  className={`form-input ${errors.email ? 'error' : ''}`}
                />
              </div>
              {errors.email && (
                <span className="error-message">{errors.email.message}</span>
              )}
            </div>

            <div className="form-group">
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...formRegister('password')}
                  className={`form-input ${errors.password ? 'error' : ''}`}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <span className="error-message">{errors.password.message}</span>
              )}
            </div>

            {!isLogin && (
              <div className="form-group">
                <div className="input-with-icon">
                  <Lock size={18} className="input-icon" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...formRegister('confirmPassword')}
                    className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <span className="error-message">{errors.confirmPassword.message}</span>
                )}
              </div>
            )}

            {isLogin && (
              <div className="form-options">
                <label className="checkbox-label">
                  <input type="checkbox" />
                  <span>Recordarme</span>
                </label>
                <button type="button" className="forgot-password-btn">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}

            <button 
              type="submit" 
              className="auth-submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="loading-spinner"></span>
              ) : (
                <>
                  {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="auth-modal-footer">
            <p className="auth-switch-text">
              {isLogin ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}
              <button 
                type="button" 
                className="auth-switch-btn"
                onClick={switchMode}
              >
                {isLogin ? ' Regístrate' : ' Inicia Sesión'}
              </button>
            </p>
            
            <div className="auth-benefits">
              <div className="benefit-item">
                <CheckCircle size={16} />
                <span>Acceso a ofertas exclusivas</span>
              </div>
              <div className="benefit-item">
                <CheckCircle size={16} />
                <span>Seguimiento de pedidos</span>
              </div>
              <div className="benefit-item">
                <CheckCircle size={16} />
                <span>Lista de deseos personalizada</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}