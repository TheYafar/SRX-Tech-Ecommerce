import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { X, Mail, Lock, User, Eye, EyeOff, CheckCircle, ArrowLeft, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { loginSchema, registerSchema } from '../utils/validation';
import './AuthModal.css';

export default function AuthModal() {
  const { isAuthModalOpen, authMode, closeAuthModal, login, register, resetPassword, setAuthMode, authContextHint, initialEmail } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // Avoids shadow with context isLoading state
  const [authError, setAuthError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotEmailError, setForgotEmailError] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const isLogin = authMode === 'login';
  const schema = isLogin ? loginSchema : registerSchema;

  const { register: formRegister, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(schema)
  });

  useEffect(() => {
    if (isAuthModalOpen) {
      reset({
        email: initialEmail || '',
        name: '',
        password: '',
        confirmPassword: ''
      });
      // Reset forgot password state when modal opens
      setShowForgotPassword(false);
      setForgotEmail('');
      setForgotEmailError('');
      setResetEmailSent(false);
    }
  }, [isAuthModalOpen, initialEmail, reset]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setAuthError('');

    try {
      if (isLogin) {
        const result = await login(data.email, data.password);

        if (!result.success) {
          // Login failed -> Show error message
          setAuthError(result.error === 'Invalid login credentials' ? 'Credenciales inválidas' : result.error);
        } else if (result.user?.role === 'admin') {
          // Admin role -> Redirect to admin panel
          closeAuthModal();
          navigate('/admin');
        } else {
          // Standard customer -> Close modal
          closeAuthModal();
        }
      } else {
        const result = await register(data.name, data.email, data.password);

        if (!result.success) {
          setAuthError(result.error || 'Error al registrar usuario');
        } else {
          // Registration successful -> Close modal
          closeAuthModal();
        }
      }
    } catch (error) {
      // Unexpected exception during authentication flow
      console.error('Error in onSubmit:', error);
      setAuthError('Error inesperado en la autenticación. Intenta de nuevo.');
    } finally {
      // Ensure submission state is reset
      setIsSubmitting(false);
    }
  };

  const switchMode = () => {
    setAuthMode(isLogin ? 'register' : 'login');
    reset();
    setAuthError('');
  };

  const handleForgotPassword = () => {
    setShowForgotPassword(true);
    setForgotEmail('');
    setForgotEmailError('');
    setResetEmailSent(false);
  };

  const handleBackToLogin = () => {
    setShowForgotPassword(false);
    setForgotEmail('');
    setForgotEmailError('');
    setResetEmailSent(false);
  };

  const handleResetPassword = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Client-side validation before hitting the API
    if (!forgotEmail.trim()) {
      setForgotEmailError('Por favor, introduce tu correo electrónico.');
      return;
    }
    if (!emailRegex.test(forgotEmail)) {
      setForgotEmailError('El correo electrónico no tiene un formato válido.');
      return;
    }

    setIsSendingReset(true);
    setForgotEmailError('');

    try {
      const result = await resetPassword(forgotEmail);
      if (result.success) {
        setResetEmailSent(true);
      } else {
        // Map common Supabase error messages to friendly Spanish copy
        const rawError = result.error || '';
        const friendlyError =
          rawError.toLowerCase().includes('user not found') ||
          rawError.toLowerCase().includes('invalid')
            ? 'No encontramos una cuenta con ese correo. Verifica que sea correcto.'
            : rawError || 'Error al enviar el enlace. Intenta de nuevo.';
        setForgotEmailError(friendlyError);
      }
    } catch {
      setForgotEmailError('Error inesperado. Por favor, intenta de nuevo.');
    } finally {
      setIsSendingReset(false);
    }
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
                {showForgotPassword
                  ? 'Restablecer Contraseña'
                  : isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </h2>
              <p className="auth-subtitle">
                {showForgotPassword
                  ? 'Introduce tu correo y te enviaremos un enlace'
                  : isLogin
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
          {authContextHint && !showForgotPassword && (
            <div className="auth-context-banner">
              <div className="auth-context-icon">
                <Lock size={16} />
              </div>
              <p className="auth-context-text">{authContextHint}</p>
            </div>
          )}

          {/* Forgot Password Form */}
          <AnimatePresence mode="wait">
            {showForgotPassword ? (
              <motion.div
                key="forgot-password"
                className="auth-form"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                {resetEmailSent ? (
                  // ✔ Success state
                  <motion.div
                    className="reset-success-container"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="reset-success-icon">
                      <CheckCircle size={48} />
                    </div>
                    <h3 className="reset-success-title">¡Enlace enviado! Revisa tu correo</h3>
                    <p className="reset-success-text">
                      Hemos enviado un enlace de recuperación a{' '}
                      <strong>{forgotEmail}</strong>. Revisa tu bandeja de entrada.
                    </p>
                    <button
                      type="button"
                      className="back-to-login-link"
                      onClick={handleBackToLogin}
                    >
                      <ArrowLeft size={16} />
                      Volver al inicio de sesión
                    </button>
                  </motion.div>
                ) : (
                  // ➤ Input state
                  <>
                    <p className="forgot-description">
                      Introduce tu correo electrónico y te enviaremos un enlace para cambiar tu contraseña.
                    </p>

                    {forgotEmailError && (
                      <motion.div
                        className="auth-error-message"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        {forgotEmailError}
                      </motion.div>
                    )}

                    <div className="form-group">
                      <div className="input-with-icon">
                        <Mail size={18} className="input-icon" />
                        <input
                          id="forgot-email"
                          type="email"
                          placeholder="ejemplo@correo.com"
                          value={forgotEmail}
                          onChange={(e) => {
                            setForgotEmail(e.target.value);
                            if (forgotEmailError) setForgotEmailError('');
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && handleResetPassword()}
                          className={`form-input ${forgotEmailError ? 'error' : ''}`}
                          autoFocus
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      id="send-reset-link-btn"
                      className="auth-submit-btn"
                      onClick={handleResetPassword}
                      disabled={isSendingReset}
                    >
                      {isSendingReset ? (
                        <>
                          <span className="loading-spinner"></span>
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send size={18} />
                          Enviar enlace de recuperación
                        </>
                      )}
                    </button>

                    <div className="forgot-back-container">
                      <button
                        type="button"
                        className="back-to-login-link"
                        onClick={handleBackToLogin}
                      >
                        <ArrowLeft size={16} />
                        Volver al inicio de sesión
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            ) : (
              // ➤ Login / Register Form
              <motion.div
                key="auth-form"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
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
                      <button
                        type="button"
                        id="forgot-password-btn"
                        className="forgot-password-btn"
                        onClick={handleForgotPassword}
                      >
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
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}