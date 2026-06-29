import { useState, useEffect, useRef } from 'react';
import { supabase, uploadBannerCoupon } from '../../utils/supabaseClient';
import { useNotifications } from '../../context/NotificationContext';
import {
  Ticket, Percent, Calendar, Loader2, Power, AlertTriangle,
  Mail, Rocket, Image, UploadCloud, LayoutTemplate, Eye,
  MessageSquare, Type
} from 'lucide-react';
import './AdminCoupons.css';

// ── Constantes de diseño ─────────────────────────────────────────────────────
const DESIGN_OPTIONS = [
  {
    value: 'banner_arriba',
    label: 'Banner arriba · Cupón abajo',
    icon: '🖼️',
    description: 'La imagen de temporada encabeza el correo y el cupón aparece debajo.',
  },
  {
    value: 'cupon_arriba',
    label: 'Cupón arriba · Banner abajo',
    icon: '🎟️',
    description: 'El código de descuento destaca primero y el banner decorativo va al final.',
  },
];

const DEFAULT_BANNER = 'https://srxtech.net/srx3.jpg';

// ── Componente Vista Previa ──────────────────────────────────────────────────
function EmailPreview({ bannerPreviewUrl, designOrder, code, discount, expiresAt }) {
  const isBannerFirst = designOrder === 'banner_arriba';
  const couponCode  = code.trim().toUpperCase() || 'CÓDIGO';
  const discountVal = discount || '??';

  const expiryLine = (() => {
    if (!expiresAt) return 'Sin fecha de vencimiento';
    const d = new Date(expiresAt + 'T23:59:59');
    return `Válido hasta el ${d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
  })();

  const bannerBlock = (
    <div className="ep-banner-block">
      <img
        src={bannerPreviewUrl || DEFAULT_BANNER}
        alt="Banner de temporada"
        className="ep-banner-img"
        onError={(e) => { e.target.src = DEFAULT_BANNER; }}
      />
    </div>
  );

  const couponBlock = (
    <div className="ep-coupon-block">
      <p className="ep-coupon-label">Descuento Exclusivo</p>
      <p className="ep-coupon-percent">{discountVal}<span>%</span></p>
      <p className="ep-coupon-hint">Ingresa este código al hacer checkout</p>
      <div className="ep-code-box">
        <span className="ep-code-text">{couponCode}</span>
      </div>
      <p className="ep-expiry">{expiryLine}</p>
    </div>
  );

  return (
    <div className="email-preview-wrapper animate-fade-in">
      <div className="email-preview-header">
        <Eye size={15} />
        <span>Vista Previa del Correo</span>
        <span className="ep-tag">{isBannerFirst ? '🖼️ Banner ↑' : '🎟️ Cupón ↑'}</span>
      </div>
      <div className="email-preview-card">
        {/* Header del email simulado */}
        <div className="ep-email-header">
          <img
            src="https://srxtech.net/Renovacion_logo_SRX_1a_2.png"
            alt="SRX Tech"
            className="ep-logo"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <p className="ep-brand-tagline">Tu tienda de tecnología de confianza</p>
        </div>

        <div className="ep-email-body">
          {isBannerFirst ? (
            <>
              {bannerBlock}
              <p className="ep-headline">🎁 ¡Tenemos un regalo para ti!</p>
              {couponBlock}
            </>
          ) : (
            <>
              <p className="ep-headline">🎁 ¡Tenemos un regalo para ti!</p>
              {couponBlock}
              {bannerBlock}
            </>
          )}
        </div>

        <div className="ep-email-footer">
          <div className="ep-cta-btn">🛒 Ir a la Tienda</div>
          <p className="ep-footer-text">© 2026 SRX Tech · srxtech.net</p>
        </div>
      </div>
    </div>
  );
}

// ── Componente Principal ─────────────────────────────────────────────────────
export default function AdminCoupons() {
  const { showSuccess, showError } = useNotifications();
  const fileInputRef = useRef(null);

  // ── Estados del formulario ──
  const [code, setCode]                     = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [expiresAt, setExpiresAt]           = useState('');
  const [isSingleUse, setIsSingleUse]       = useState(false);
  const [isSubmitting, setIsSubmitting]     = useState(false);

  // ── Email / campaña ──
  const [sendEmail, setSendEmail]           = useState(false);
  const [isMassEmail, setIsMassEmail]       = useState(false);
  const [customerEmail, setCustomerEmail]   = useState('');
  const [emailSubject, setEmailSubject]     = useState('');
  const [emailMessage, setEmailMessage]     = useState('');

  // ── Banner & orden visual ──
  const [bannerFile, setBannerFile]         = useState(null);      // archivo local
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState('');    // blob URL para preview
  const [bannerUrl, setBannerUrl]           = useState('');        // URL pública de Supabase
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [designOrder, setDesignOrder]       = useState('banner_arriba');

  // ── Lista ──
  const [coupons, setCoupons]       = useState([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [actioningId, setActioningId] = useState(null);

  // Limpiar el blob URL al desmontar o cuando cambie el archivo
  useEffect(() => {
    return () => {
      if (bannerPreviewUrl && bannerPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(bannerPreviewUrl);
      }
    };
  }, [bannerPreviewUrl]);

  // ── Fetch cupones ────────────────────────────────────────────────────────
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

  useEffect(() => { fetchCoupons(); }, []);

  // ── Manejo de selección de archivo ──────────────────────────────────────
  const handleBannerFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      showError('Solo se permiten archivos de imagen (JPG, PNG, WEBP, etc.).');
      return;
    }
    // Validar tamaño: max 5 MB
    if (file.size > 5 * 1024 * 1024) {
      showError('La imagen no puede superar los 5 MB.');
      return;
    }

    // Preview local instantánea
    if (bannerPreviewUrl && bannerPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(bannerPreviewUrl);
    }
    const previewBlob = URL.createObjectURL(file);
    setBannerFile(file);
    setBannerPreviewUrl(previewBlob);
    setBannerUrl(''); // resetear URL pública anterior

    // Subir inmediatamente a Supabase Storage
    setIsUploadingBanner(true);
    try {
      const publicUrl = await uploadBannerCoupon(file);
      setBannerUrl(publicUrl);
      showSuccess('Banner subido correctamente al bucket de Supabase.');
    } catch (err) {
      showError(err.message || 'No se pudo subir el banner. Verifica el bucket banners_cupones.');
      setBannerFile(null);
      setBannerPreviewUrl('');
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const handleRemoveBanner = () => {
    if (bannerPreviewUrl && bannerPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(bannerPreviewUrl);
    }
    setBannerFile(null);
    setBannerPreviewUrl('');
    setBannerUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Submit formulario ───────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanCode = code.trim().toUpperCase();
    const percent   = parseInt(discountPercent);

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
    if (sendEmail && bannerFile && !bannerUrl) {
      showError('El banner aún se está subiendo. Por favor espera unos segundos.');
      return;
    }

    setIsSubmitting(true);
    try {
      const expiresIso = expiresAt ? new Date(expiresAt + 'T23:59:59').toISOString() : null;

      // 1. Insertar en base de datos
      const { error } = await supabase
        .from('coupons')
        .insert([{
          code: cleanCode,
          discount_percent: percent,
          expires_at: expiresIso,
          is_active: true,
          is_single_use: isSingleUse,
        }])
        .select();

      if (error) {
        if (error.code === '23505') throw new Error('Ya existe un cupón con este código.');
        throw error;
      }

      // 2. Enviar correo si está activado
      if (sendEmail) {
        const emailPayload = {
          code: cleanCode,
          discount: percent,
          expiration: expiresIso,
          banner_url: bannerUrl || null,
          design_order: designOrder,
          email_subject: emailSubject.trim(),
          email_message: emailMessage.trim(),
          ...(isMassEmail ? {} : { single_recipient: customerEmail.trim() }),
        };

        const response = await fetch('/send-coupon-email.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(emailPayload),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Error en envío de correo (Status ${response.status})`);
        }

        const resData = await response.json();
        if (!resData.success) {
          throw new Error(resData.error || 'Error desconocido en el servidor PHP.');
        }
      }

      // 3. Notificación de éxito
      if (sendEmail) {
        showSuccess(isMassEmail
          ? `Cupón "${cleanCode}" registrado y campaña masiva enviada a todos los usuarios.`
          : `Cupón "${cleanCode}" registrado y enviado a ${customerEmail.trim()}.`
        );
      } else {
        showSuccess(`Cupón "${cleanCode}" creado exitosamente.`);
      }

      // 4. Reset
      setCode('');
      setDiscountPercent('');
      setExpiresAt('');
      setIsSingleUse(false);
      setSendEmail(false);
      setIsMassEmail(false);
      setCustomerEmail('');
      setEmailSubject('');
      setEmailMessage('');
      handleRemoveBanner();
      setDesignOrder('banner_arriba');

      await fetchCoupons();
    } catch (err) {
      console.error('Error creating/sending coupon in AdminCoupons:', err);
      showError(err.message || 'Error al procesar el cupón.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Toggle estado activo ────────────────────────────────────────────────
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
      setCoupons(prev => prev.map(c => (c.id === coupon.id ? { ...c, is_active: nextState } : c)));
    } catch (err) {
      console.error('Error toggling coupon state in AdminCoupons:', err);
      showError('No se pudo actualizar el estado del cupón.');
    } finally {
      setActioningId(null);
    }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────
  const formatDate = (d) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const isExpired = (d) => d ? new Date() > new Date(d) : false;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="admin-coupons-container animate-fade-in">
      <div className="admin-coupons-header">
        <h1 className="admin-coupons-title">Gestión de Cupones</h1>
        <p className="admin-coupons-subtitle">
          Crea, visualiza y controla los cupones de descuento activos para la tienda.
        </p>
      </div>

      {/* ── Formulario de Alta ── */}
      <section className="admin-coupons-form-section">
        <h2 className="section-title">Gestión y Emisión de Cupones</h2>
        <form onSubmit={handleSubmit} className="admin-coupons-form">

          {/* Grid principal */}
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

          {/* Switch: un solo uso */}
          <div className="automation-switch-group">
            <div className="switch-container">
              <label className="switch-label">
                <input
                  type="checkbox"
                  className="switch-input"
                  checked={isSingleUse}
                  onChange={(e) => setIsSingleUse(e.target.checked)}
                />
                <div className="switch-track"><div className="switch-thumb" /></div>
                <span className="switch-label-text">¿Es cupón de un solo uso?</span>
              </label>
            </div>
          </div>

          {/* Switch: enviar correo */}
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
                      setEmailSubject('');
                      setEmailMessage('');
                      handleRemoveBanner();
                      setDesignOrder('banner_arriba');
                    }
                  }}
                />
                <div className="switch-track"><div className="switch-thumb" /></div>
                <span className="switch-label-text">¿Deseas enviar este cupón por correo electrónico?</span>
              </label>
            </div>
          </div>

          {/* Campos condicionales */}
          <div className={`conditional-fields ${sendEmail ? 'expanded' : ''}`}>
            {sendEmail && (
              <div className="conditional-fields-content animate-slide-down">

                {/* Switch campaña masiva */}
                <div className="form-group mass-email-switch-group">
                  <div className="switch-container">
                    <label className="switch-label">
                      <input
                        type="checkbox"
                        className="switch-input"
                        checked={isMassEmail}
                        onChange={(e) => {
                          setIsMassEmail(e.target.checked);
                          if (e.target.checked) setCustomerEmail('');
                        }}
                      />
                      <div className="switch-track"><div className="switch-thumb" /></div>
                      <span className="switch-label-text">¿Enviar campaña masiva a todos los usuarios?</span>
                    </label>
                  </div>
                </div>

                {/* Email individual */}
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

                {/* ────────────────────────────────────────────────────── */}
                {/* ASUNTO Y MENSAJE PERSONALIZADO */}
                {/* ────────────────────────────────────────────────────── */}
                <div className="form-group email-input-group">
                  <label htmlFor="email-subject">
                    <Type size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                    Asunto del Correo
                  </label>
                  <div className="input-icon-wrapper">
                    <Type className="input-icon" size={18} />
                    <input
                      id="email-subject"
                      type="text"
                      placeholder="Ej: 🎁 ¡Cupón exclusivo para ti, {nombre}!"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="coupon-text-input"
                    />
                  </div>
                  <p className="field-hint">
                    Si lo dejas vacío se usará el asunto corporativo por defecto.
                  </p>
                </div>

                <div className="form-group email-input-group">
                  <label htmlFor="email-message">
                    <MessageSquare size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                    Mensaje Personalizado
                  </label>
                  <textarea
                    id="email-message"
                    rows={5}
                    placeholder={`Ej: Hola,\n\nComo agradecimiento por tu fidelidad, te regalamos este cupón exclusivo para tu próxima compra en SRX Tech.\n\n¡Esperamos verte pronto!`}
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    className="email-message-textarea"
                  />
                  <p className="field-hint">
                    Los saltos de línea se respetarán en el correo. Si lo dejas vacío se usará el texto corporativo por defecto.
                  </p>
                </div>

                {/* ────────────────────────────────────────────────────── */}
                {/* CARGA DE BANNER */}
                {/* ────────────────────────────────────────────────────── */}
                <div className="form-group email-input-group">
                  <label>
                    <Image size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                    Imagen del Banner de Temporada
                  </label>

                  {!bannerFile ? (
                    /* Zona de drop / click */
                    <div
                      className="banner-upload-zone"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <UploadCloud size={32} className="upload-zone-icon" />
                      <p className="upload-zone-title">Haz clic para subir una imagen</p>
                      <p className="upload-zone-hint">JPG, PNG, WEBP — máx. 5 MB</p>
                      <p className="upload-zone-note">
                        Se subirá automáticamente al bucket <code>banners_cupones</code> de Supabase
                      </p>
                    </div>
                  ) : (
                    /* Thumbnail con estado de carga */
                    <div className="banner-thumb-wrapper">
                      <img
                        src={bannerPreviewUrl}
                        alt="Preview del banner"
                        className="banner-thumb-img"
                      />
                      <div className="banner-thumb-overlay">
                        {isUploadingBanner ? (
                          <div className="banner-uploading-badge">
                            <Loader2 size={14} className="spin" />
                            <span>Subiendo…</span>
                          </div>
                        ) : bannerUrl ? (
                          <div className="banner-ready-badge">✅ Listo</div>
                        ) : (
                          <div className="banner-error-badge">❌ Error</div>
                        )}
                        <button
                          type="button"
                          className="banner-remove-btn"
                          onClick={handleRemoveBanner}
                          title="Eliminar banner"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="banner-file-input-hidden"
                    onChange={handleBannerFileChange}
                  />
                  <p className="field-hint">
                    Si no subes una imagen se usará el banner por defecto de SRX Tech.
                  </p>
                </div>

                {/* ────────────────────────────────────────────────────── */}
                {/* SELECTOR DE ORDEN VISUAL */}
                {/* ────────────────────────────────────────────────────── */}
                <div className="form-group email-input-group">
                  <label>
                    <LayoutTemplate size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                    Orden Visual del Correo
                  </label>
                  <div className="design-order-selector">
                    {DESIGN_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`design-order-btn ${designOrder === opt.value ? 'active' : ''}`}
                        onClick={() => setDesignOrder(opt.value)}
                      >
                        <span className="dob-icon">{opt.icon}</span>
                        <span className="dob-label">{opt.label}</span>
                        <span className="dob-desc">{opt.description}</span>
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* ── VISTA PREVIA DINÁMICA ── */}
          {sendEmail && (
            <EmailPreview
              bannerPreviewUrl={bannerPreviewUrl || bannerUrl}
              designOrder={designOrder}
              code={code}
              discount={discountPercent}
              expiresAt={expiresAt}
            />
          )}

          <div className="form-submit-row">
            <button
              type="submit"
              disabled={isSubmitting || isUploadingBanner}
              className={`generate-coupon-btn ${sendEmail ? 'btn-send-email' : ''}`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="spin" size={18} />
                  <span>Procesando…</span>
                </>
              ) : isUploadingBanner ? (
                <>
                  <Loader2 className="spin" size={18} />
                  <span>Subiendo banner…</span>
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

      {/* ── Tabla de Gestión ── */}
      <section className="admin-coupons-list-section">
        <h2 className="section-title">Listado de Cupones</h2>

        {isLoading ? (
          <div className="admin-coupons-loading">
            <Loader2 className="spin" size={36} />
            <p>Cargando cupones registrados…</p>
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
                  <th>Tipo</th>
                  <th>Creado el</th>
                  <th>Expira el</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => {
                  const expired = isExpired(coupon.expires_at);
                  const active  = coupon.is_active && !expired;
                  return (
                    <tr key={coupon.id} className={expired ? 'coupon-row-expired' : ''}>
                      <td className="coupon-code-cell">
                        <span className="code-badge">{coupon.code}</span>
                      </td>
                      <td className="coupon-discount-cell">
                        <span className="discount-value">{coupon.discount_percent}%</span>
                      </td>
                      <td>
                        {coupon.is_single_use
                          ? <span className="badge-single-use">Un solo uso</span>
                          : <span className="badge-multi-use">Múltiple</span>
                        }
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
                        {active
                          ? <span className="status-badge status-active">Activo</span>
                          : <span className="status-badge status-inactive">{expired ? 'Expirado' : 'Inactivo'}</span>
                        }
                      </td>
                      <td>
                        <button
                          onClick={() => handleToggleActive(coupon)}
                          disabled={actioningId === coupon.id || expired}
                          className={`action-toggle-btn ${coupon.is_active ? 'btn-disable' : 'btn-enable'}`}
                          title={expired ? 'El cupón ha expirado y no se puede habilitar' : ''}
                        >
                          {actioningId === coupon.id
                            ? <Loader2 className="spin" size={14} />
                            : <Power size={14} />
                          }
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
