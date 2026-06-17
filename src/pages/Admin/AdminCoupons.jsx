import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { useNotifications } from '../../context/NotificationContext';
import { Ticket, Percent, Calendar, Loader2, Power, AlertTriangle, Mail, Send, Rocket } from 'lucide-react';
import { getAllUserEmails, dispatchMassCampaign } from '../../services/couponService';
import './AdminCoupons.css';

export default function AdminCoupons() {
  const { showSuccess, showError } = useNotifications();

  // Form states
  const [code, setCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Automation / Email states
  const [sendEmail, setSendEmail] = useState(false);
  const [isMassEmail, setIsMassEmail] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');

  // List states
  const [coupons, setCoupons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null); // to show loading on individual toggle buttons

  // Fetch coupons from Supabase
  const fetchCoupons = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons(data || []);
    } catch (err) {
      console.error('Error fetching coupons in AdminCoupons:', err);
      showError('No se pudieron cargar los cupones.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  // Form submit (create coupon & send emails if activated)
  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanCode = code.trim().toUpperCase();
    const percent = parseInt(discountPercent);

    // Validation
    if (!cleanCode) {
      showError('El código del cupón es obligatorio.');
      return;
    }
    if (isNaN(percent) || percent < 1 || percent > 100) {
      showError('El descuento debe ser un número entre 1 y 100.');
      return;
    }

    if (sendEmail && !isMassEmail && (!customerEmail || !customerEmail.trim())) {
      showError('Por favor introduce el correo electrónico del cliente.');
      return;
    }

    setIsSubmitting(true);
    try {
      const expiresIso = expiresAt ? new Date(expiresAt + 'T23:59:59').toISOString() : null;

      // 1. Insert in database
      const { data, error } = await supabase
        .from('coupons')
        .insert([
          {
            code: cleanCode,
            discount_percent: percent,
            expires_at: expiresIso,
            is_active: true
          }
        ])
        .select();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Ya existe un cupón con este código.');
        }
        throw error;
      }

      // 2. Send emails if option is active
      if (sendEmail) {
        let emailsList = [];
        if (isMassEmail) {
          emailsList = await getAllUserEmails();
          if (emailsList.length === 0) {
            throw new Error('No se encontraron usuarios en la base de datos para enviar la campaña.');
          }
        } else {
          emailsList = [customerEmail.trim()];
        }

        await dispatchMassCampaign(cleanCode, percent, emailsList);
      }

      // 3. Show success notifications
      if (sendEmail) {
        showSuccess(isMassEmail
          ? `Cupón "${cleanCode}" registrado y campaña masiva enviada a todos los usuarios.`
          : `Cupón "${cleanCode}" registrado y enviado a ${customerEmail.trim()}.`
        );
      } else {
        showSuccess(`Cupón "${cleanCode}" creado exitosamente.`);
      }
      
      // Reset form
      setCode('');
      setDiscountPercent('');
      setExpiresAt('');
      setSendEmail(false);
      setIsMassEmail(false);
      setCustomerEmail('');

      // Refresh list
      await fetchCoupons();
    } catch (err) {
      console.error('Error creating/sending coupon in AdminCoupons:', err);
      showError(err.message || 'Error al procesar el cupón.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (coupon) => {
    const nextState = !coupon.is_active;
    setActioningId(coupon.id);

    try {
      const { error } = await supabase
        .from('coupons')
        .update({ is_active: nextState })
        .eq('id', coupon.id);

      if (error) throw error;

      showSuccess(`Cupón "${coupon.code}" ${nextState ? 'habilitado' : 'deshabilitado'} correctamente.`);
      
      // Update local state to avoid full re-fetch if possible
      setCoupons(prev =>
        prev.map(c => (c.id === coupon.id ? { ...c, is_active: nextState } : c))
      );
    } catch (err) {
      console.error('Error toggling coupon state in AdminCoupons:', err);
      showError('No se pudo actualizar el estado del cupón.');
    } finally {
      setActioningId(null);
    }
  };

  // Helper formats
  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const isExpired = (expiresAtString) => {
    if (!expiresAtString) return false;
    return new Date() > new Date(expiresAtString);
  };

  return (
    <div className="admin-coupons-container animate-fade-in">
      <div className="admin-coupons-header">
        <h1 className="admin-coupons-title">Gestión de Cupones</h1>
        <p className="admin-coupons-subtitle">
          Crea, visualiza y controla los cupones de descuento activos para la tienda.
        </p>
      </div>

      {/* ── Formulario de Alta (Crear Cupones) ── */}
      <section className="admin-coupons-form-section">
        <h2 className="section-title">Gestión y Emisión de Cupones</h2>
        <form onSubmit={handleSubmit} className="admin-coupons-form">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="coupon-code">Código del Cupón</label>
              <div className="input-icon-wrapper">
                <Ticket className="input-icon" size={18} />
                <input
                  id="coupon-code"
                  type="text"
                  placeholder="Ej: VERANO20"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  required
                  className="coupon-text-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="coupon-discount">Descuento (%)</label>
              <div className="input-icon-wrapper">
                <Percent className="input-icon" size={18} />
                <input
                  id="coupon-discount"
                  type="number"
                  placeholder="Ej: 15"
                  min="1"
                  max="100"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="coupon-expiry">Expiración (Opcional)</label>
              <div className="input-icon-wrapper">
                <Calendar className="input-icon" size={18} />
                <input
                  id="coupon-expiry"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Interruptor de Automatización */}
          <div className="automation-switch-group">
            <div className="switch-container">
              <label className="switch-label">
                <input
                  type="checkbox"
                  className="switch-input"
                  checked={sendEmail}
                  onChange={(e) => {
                    setSendEmail(e.target.checked);
                    if (!e.target.checked) {
                      setIsMassEmail(false);
                      setCustomerEmail('');
                    }
                  }}
                />
                <div className="switch-track">
                  <div className="switch-thumb" />
                </div>
                <span className="switch-label-text">¿Deseas enviar este cupón por correo electrónico?</span>
              </label>
            </div>
          </div>

          {/* Campos Condicionales con Despliegue Suave */}
          <div className={`conditional-fields ${sendEmail ? 'expanded' : ''}`}>
            {sendEmail && (
              <div className="conditional-fields-content animate-slide-down">
                {/* Switch de campaña masiva */}
                <div className="form-group mass-email-switch-group">
                  <div className="switch-container">
                    <label className="switch-label">
                      <input
                        type="checkbox"
                        className="switch-input"
                        checked={isMassEmail}
                        onChange={(e) => {
                          setIsMassEmail(e.target.checked);
                          if (e.target.checked) {
                            setCustomerEmail('');
                          }
                        }}
                      />
                      <div className="switch-track">
                        <div className="switch-thumb" />
                      </div>
                      <span className="switch-label-text">¿Enviar campaña masiva a todos los usuarios?</span>
                    </label>
                  </div>
                </div>

                {/* Input de correo cliente (se oculta automáticamente si es masivo) */}
                {!isMassEmail && (
                  <div className="form-group email-input-group">
                    <label htmlFor="customer-email">Correo Electrónico del Cliente</label>
                    <div className="input-icon-wrapper">
                      <Mail className="input-icon" size={18} />
                      <input
                        id="customer-email"
                        type="email"
                        placeholder="cliente@ejemplo.com"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        required={sendEmail && !isMassEmail}
                        className="coupon-text-input-email"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="form-submit-row">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`generate-coupon-btn ${sendEmail ? 'btn-send-email' : ''}`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="spin" size={18} />
                  <span>Procesando...</span>
                </>
              ) : sendEmail ? (
                <>
                  <Rocket size={18} />
                  <span>Generar y Enviar Cupón</span>
                </>
              ) : (
                <>
                  <Ticket size={18} />
                  <span>Generar Cupón</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* ── Tabla de Gestión en Tiempo Real ── */}
      <section className="admin-coupons-list-section">
        <h2 className="section-title">Listado de Cupones</h2>

        {isLoading ? (
          <div className="admin-coupons-loading">
            <Loader2 className="spin" size={36} />
            <p>Cargando cupones registrados...</p>
          </div>
        ) : coupons.length === 0 ? (
          <div className="admin-coupons-empty">
            <Ticket size={48} className="empty-icon" />
            <p>No se encontraron cupones registrados.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="coupons-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descuento</th>
                  <th>Creado el</th>
                  <th>Expira el</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => {
                  const expired = isExpired(coupon.expires_at);
                  const active = coupon.is_active && !expired;
                  
                  return (
                    <tr key={coupon.id} className={expired ? 'coupon-row-expired' : ''}>
                      <td className="coupon-code-cell">
                        <span className="code-badge">{coupon.code}</span>
                      </td>
                      <td className="coupon-discount-cell">
                        <span className="discount-value">{coupon.discount_percent}%</span>
                      </td>
                      <td>{formatDate(coupon.created_at)}</td>
                      <td>
                        {coupon.expires_at ? (
                          <span className={expired ? 'date-expiredText' : ''}>
                            {formatDate(coupon.expires_at)}
                            {expired && (
                              <span className="expired-alert-badge" title="Este cupón ya expiró">
                                <AlertTriangle size={12} /> Expirado
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="no-limit-badge">Sin límite</span>
                        )}
                      </td>
                      <td>
                        {active ? (
                          <span className="status-badge status-active">Activo</span>
                        ) : (
                          <span className="status-badge status-inactive">
                            {expired ? 'Expirado' : 'Inactivo'}
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => handleToggleActive(coupon)}
                          disabled={actioningId === coupon.id || expired}
                          className={`action-toggle-btn ${
                            coupon.is_active ? 'btn-disable' : 'btn-enable'
                          }`}
                          title={expired ? 'El cupón ha expirado y no se puede habilitar' : ''}
                        >
                          {actioningId === coupon.id ? (
                            <Loader2 className="spin" size={14} />
                          ) : (
                            <Power size={14} />
                          )}
                          <span>{coupon.is_active ? 'Deshabilitar' : 'Habilitar'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
