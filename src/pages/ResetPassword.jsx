import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle, CheckCircle } from 'lucide-react';
import './ResetPassword.css';

// ── States the page can be in ────────────────────────────────────────────────
const VIEW = {
  LOADING: 'loading',  // Parsing & validating token from URL
  FORM:    'form',     // Token valid → show password inputs
  SUCCESS: 'success',  // Password updated successfully
  EXPIRED: 'expired',  // Token missing / expired
};

export default function ResetPassword() {
  const navigate = useNavigate();
  const { openAuthModal } = useAuth();

  // ── MODO PRUEBA: el formulario siempre es visible al cargar ────────────────
  // TODO: Revertir a VIEW.LOADING cuando la validación de token esté estable.
  const [view,            setView]            = useState(VIEW.FORM);
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew,         setShowNew]         = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [isSubmitting,    setIsSubmitting]    = useState(false);
  const [fieldError,      setFieldError]      = useState('');
  const [apiError,        setApiError]        = useState('');

  // ── On mount: intentar cargar sesión desde el token de la URL (no bloqueante) ─
  // Con HashRouter la URL luce así:
  //   http://host/#/reset-password#access_token=...&type=recovery
  // El formulario se muestra SIEMPRE (estado inicial = VIEW.FORM).
  // Esta lógica solo intenta hidratar la sesión de Supabase si hay token.
  useEffect(() => {
    const rawHash = window.location.hash;

    // Extraer los parámetros de auth que Supabase añade tras el segundo '#'
    const lastHash = rawHash.lastIndexOf('#access_token');
    const paramString = lastHash !== -1
      ? rawHash.slice(lastHash + 1)
      : rawHash.includes('access_token=')
        ? rawHash.slice(rawHash.indexOf('access_token='))
        : '';

    const params       = new URLSearchParams(paramString);
    const accessToken  = params.get('access_token');
    const refreshToken = params.get('refresh_token') || '';

    if (accessToken) {
      // Hidratar sesión en background; el formulario ya está visible
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) {
            console.warn('[ResetPassword] setSession falló (el usuario puede intentar igual):', error.message);
          }
          // Limpiar el token sensible de la barra de URL
          window.history.replaceState(null, '', window.location.pathname);
        });
    } else {
      // Sin token en URL: el formulario sigue visible en modo prueba
      console.info('[ResetPassword] Sin token en URL — mostrando formulario en modo prueba.');
    }
    // En ningún caso cambiamos el view a EXPIRED aquí.
    // TODO: Restaurar validación estricta una vez que el flujo de Supabase esté estable.
  }, []);

  // ── Form submission ──────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldError('');
    setApiError('');

    if (newPassword.length < 8) {
      setFieldError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setFieldError('Las contraseñas no coinciden. Verifica e intenta de nuevo.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        console.error('[ResetPassword] updateUser error:', error.message);
        const isExpired =
          error.message?.toLowerCase().includes('expired') ||
          error.message?.toLowerCase().includes('invalid');

        if (isExpired) {
          setView(VIEW.EXPIRED);
        } else {
          setApiError(error.message || 'Error al actualizar la contraseña. Intenta de nuevo.');
        }
      } else {
        await supabase.auth.signOut(); // Force fresh login with new password
        setView(VIEW.SUCCESS);
      }
    } catch (err) {
      console.error('[ResetPassword] unexpected error:', err);
      setApiError('Error inesperado. Por favor, intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Redirect to home and open the forgot-password modal ─────────────────────
  const goToLogin = () => {
    navigate('/', { replace: true });
    // Abre el modal directamente en la vista 'forgot-password' para que el usuario
    // pueda solicitar un nuevo enlace sin pasos extra.
    setTimeout(() => openAuthModal('forgot-password'), 150);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="rp-page">
      {/* Ambient background blobs */}
      <div className="rp-bg-blob rp-blob-1" aria-hidden="true" />
      <div className="rp-bg-blob rp-blob-2" aria-hidden="true" />

      <AnimatePresence mode="wait">

        {/* ── LOADING ── */}
        {view === VIEW.LOADING && (
          <motion.div
            key="loading"
            className="rp-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="rp-spinner-wrap">
              <span className="rp-spinner" />
              <p className="rp-loading-text">Verificando enlace de recuperación…</p>
            </div>
          </motion.div>
        )}

        {/* ── FORM ── */}
        {view === VIEW.FORM && (
          <motion.div
            key="form"
            className="rp-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
          >
            {/* Header */}
            <div className="rp-header">
              <div className="rp-logo">
                <span className="rp-logo-srx">SRX</span>
                <span className="rp-logo-divider">|</span>
                <span className="rp-logo-tech">Tech</span>
              </div>
              <div className="rp-icon-wrap">
                <ShieldCheck size={32} />
              </div>
              <h1 className="rp-title">Actualizar Contraseña</h1>
              <p className="rp-subtitle">Elige una contraseña segura para proteger tu cuenta.</p>
            </div>

            {/* Form body */}
            <form className="rp-form" onSubmit={handleSubmit} noValidate>

              {/* Error banners */}
              <AnimatePresence>
                {(apiError || fieldError) && (
                  <motion.div
                    className="rp-alert rp-alert--error"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    <AlertCircle size={16} />
                    <span>{apiError || fieldError}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Nueva Contraseña */}
              <div className="rp-field">
                <label className="rp-label" htmlFor="rp-new-password">
                  Nueva Contraseña
                </label>
                <div className="rp-input-wrap">
                  <Lock size={18} className="rp-input-icon" />
                  <input
                    id="rp-new-password"
                    type={showNew ? 'text' : 'password'}
                    className={`rp-input ${fieldError && fieldError.includes('caract') ? 'rp-input--error' : ''}`}
                    placeholder="Mínimo 8 caracteres"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (fieldError) setFieldError('');
                      if (apiError)   setApiError('');
                    }}
                    autoComplete="new-password"
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    className="rp-toggle"
                    onClick={() => setShowNew((v) => !v)}
                    aria-label={showNew ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <StrengthBar password={newPassword} />
              </div>

              {/* Confirmar Contraseña */}
              <div className="rp-field">
                <label className="rp-label" htmlFor="rp-confirm-password">
                  Repetir Nueva Contraseña
                </label>
                <div className="rp-input-wrap">
                  <Lock size={18} className="rp-input-icon" />
                  <input
                    id="rp-confirm-password"
                    type={showConfirm ? 'text' : 'password'}
                    className={`rp-input ${fieldError && fieldError.includes('coincid') ? 'rp-input--error' : ''}`}
                    placeholder="Repite tu nueva contraseña"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (fieldError) setFieldError('');
                    }}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="rp-toggle"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                id="rp-submit-btn"
                className="rp-btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="rp-spinner rp-spinner--sm" />
                    Guardando…
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    Guardar nueva contraseña
                  </>
                )}
              </button>
            </form>
          </motion.div>
        )}

        {/* ── SUCCESS ── */}
        {view === VIEW.SUCCESS && (
          <motion.div
            key="success"
            className="rp-card rp-card--centered"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
          >
            <motion.div
              className="rp-result-icon rp-result-icon--success"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', damping: 14, stiffness: 200 }}
            >
              <CheckCircle size={52} />
            </motion.div>
            <h2 className="rp-result-title">¡Contraseña actualizada!</h2>
            <p className="rp-result-text">
              Tu contraseña se guardó correctamente. Ya puedes iniciar sesión con tus nuevas credenciales.
            </p>
            <button
              id="rp-go-login-btn"
              className="rp-btn-primary"
              onClick={goToLogin}
            >
              Ir a Iniciar Sesión
            </button>
          </motion.div>
        )}

        {/* ── EXPIRED ── */}
        {view === VIEW.EXPIRED && (
          <motion.div
            key="expired"
            className="rp-card rp-card--centered"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
          >
            <motion.div
              className="rp-result-icon rp-result-icon--error"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', damping: 14, stiffness: 200 }}
            >
              <AlertCircle size={52} />
            </motion.div>
            <h2 className="rp-result-title">Enlace inválido o expirado</h2>
            <p className="rp-result-text">
              Este enlace de recuperación ya no es válido. Por seguridad, los enlaces expiran a los 60 minutos.
              Solicita uno nuevo desde el inicio de sesión.
            </p>
            <button
              id="rp-request-new-btn"
              className="rp-btn-primary"
              onClick={goToLogin}
            >
              Solicitar nuevo enlace
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

// ── Password strength indicator ───────────────────────────────────────────────
function StrengthBar({ password }) {
  if (!password) return null;

  let strength = 0;
  if (password.length >= 8)           strength++;
  if (/[A-Z]/.test(password))         strength++;
  if (/[0-9]/.test(password))         strength++;
  if (/[^A-Za-z0-9]/.test(password))  strength++;

  const labels  = ['', 'Débil', 'Regular', 'Buena', 'Fuerte'];
  const classes = ['', 'weak',  'fair',    'good',  'strong'];

  return (
    <div className="rp-strength">
      <div className="rp-strength-bars">
        {[1, 2, 3, 4].map((level) => (
          <span
            key={level}
            className={`rp-strength-bar ${strength >= level ? classes[strength] : ''}`}
          />
        ))}
      </div>
      {strength > 0 && (
        <span className={`rp-strength-label rp-strength-label--${classes[strength]}`}>
          {labels[strength]}
        </span>
      )}
    </div>
  );
}
