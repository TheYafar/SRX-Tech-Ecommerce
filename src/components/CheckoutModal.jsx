import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { useNotifications } from '../context/NotificationContext';
import { X, CreditCard, Shield, CheckCircle, AlertCircle, Lock, User, Mail, Phone, Upload, Smartphone, ShoppingBag, ArrowRight, Sparkles } from 'lucide-react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { supabase, uploadReceipt } from '../utils/supabaseClient';
import PaymentInstructions from './PaymentInstructions';
import './CheckoutModal.css';

const CONFETTI_PARTICLES = [
  { y: [0, -110, 150], x: [45], rotate: [0, 180], duration: 2.5, delay: 0.4, width: 11, height: 13 },
  { y: [0, -95, 175], x: [-60], rotate: [0, 240], duration: 3.1, delay: 0.6, width: 9, height: 9 },
  { y: [0, -135, 190], x: [85], rotate: [0, 310], duration: 2.1, delay: 0.3, width: 14, height: 10 },
  { y: [0, -80, 130], x: [-35], rotate: [0, 95], duration: 2.8, delay: 0.5, width: 8, height: 12 },
  { y: [0, -120, 160], x: [70], rotate: [0, 150], duration: 3.4, delay: 0.7, width: 12, height: 8 },
  { y: [0, -100, 140], x: [-80], rotate: [0, 290], duration: 2.3, delay: 0.35, width: 10, height: 14 },
  { y: [0, -140, 200], x: [20], rotate: [0, 350], duration: 3.2, delay: 0.8, width: 13, height: 11 },
  { y: [0, -90, 165], x: [-50], rotate: [0, 120], duration: 2.6, delay: 0.45, width: 9, height: 13 },
  { y: [0, -115, 180], x: [95], rotate: [0, 210], duration: 2.9, delay: 0.55, width: 11, height: 9 },
  { y: [0, -130, 155], x: [-25], rotate: [0, 170], duration: 3.5, delay: 0.9, width: 14, height: 14 },
  { y: [0, -85, 145], x: [60], rotate: [0, 260], duration: 2.2, delay: 0.38, width: 8, height: 10 },
  { y: [0, -105, 185], x: [-70], rotate: [0, 330], duration: 3.0, delay: 0.65, width: 12, height: 12 }
];

const renderPaymentIcon = (id) => {
  switch (id) {
    case 'zelle':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 4H5L19 20H5" />
        </svg>
      );
    case 'binance':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 12l10 10 10-10L12 2z"/>
          <path d="M12 6l-6 6 6 6 6-6-6-6z"/>
        </svg>
      );
    case 'paypal':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 7h-9M14 21V3M10 21V10M18 21V14"/>
        </svg>
      );
    case 'pago-movil':
      return <Smartphone size={24} stroke="currentColor" strokeWidth={2} />;
    case 'tarjeta':
      return <CreditCard size={24} stroke="currentColor" strokeWidth={2} />;
    default:
      return null;
  }
};

export default function CheckoutModal({ isOpen, onClose }) {
  const { cartItems, cartTotal, clearCart } = useCart();
  const { user, openAuthModalWithAction } = useAuth();
  const { formatVES, exchangeRate } = useCurrency();
  const { showSuccess, showError } = useNotifications();
  const [paymentMethod, setPaymentMethod] = useState('zelle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [savedTotal, setSavedTotal] = useState(0);
  const [orderRefCode, setOrderRefCode] = useState('');
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    cardNumber: '',
    cardExpiry: '',
    cardCvc: '',
    referenceNumber: '',
    receiptFile: null
  });
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0); // Porcentaje (Ej: 10 para 10%)
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');

  const discountAmount = Number((cartTotal * (appliedDiscount / 100)).toFixed(2));
  const finalTotal = Math.max(0, Number((cartTotal - discountAmount).toFixed(2)));

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isContactInfoValid = 
    (user 
      ? formData.name.trim() !== '' 
      : (formData.name.trim().split(/\s+/).filter(Boolean).length >= 2)
    ) && 
    (user ? true : emailRegex.test(formData.email.trim())) && 
    formData.phone.trim() !== '';

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || user.name || '',
        email: prev.email || user.email || ''
      }));
    }
  }, [user]);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Ingresa tu cupón');
      setAppliedDiscount(0);
      setCouponSuccess('');
      return;
    }
    try {
      setCouponError('');
      setCouponSuccess('');
      const cleanCode = couponCode.trim().toUpperCase();

      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', cleanCode)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        setCouponError('Cupón inválido o inactivo');
        setAppliedDiscount(0);
        return;
      }

      // Comprobar expiración
      const now = new Date();
      if (data.expires_at && now > new Date(data.expires_at)) {
        setCouponError('El cupón ha expirado');
        setAppliedDiscount(0);
        return;
      }

      const percent = data.discount_percent || data.discount_percentage || data.discount || 0;
      if (percent <= 0) {
        setCouponError('Cupón con valor de descuento inválido');
        setAppliedDiscount(0);
        return;
      }

      setAppliedDiscount(percent);
      setCouponSuccess(`¡Cupón del ${percent}% aplicado!`);
      setCouponError('');
    } catch (err) {
      console.error('Error validating coupon:', err);
      setCouponError('Error al validar cupón');
      setAppliedDiscount(0);
    }
  };

  const processCheckout = async (paypalDetails = null) => {
    setIsSubmitting(true);
    let uploadedReceiptUrl = null;

    try {
      // Paso 1: Subir el comprobante a Supabase Storage (omitir si es pago directo por PayPal)
      if (formData.receiptFile && !paypalDetails) {
        uploadedReceiptUrl = await uploadReceipt(formData.receiptFile);
        if (!uploadedReceiptUrl) {
          throw new Error('No se pudo subir la imagen del comprobante o no se generó una dirección pública.');
        }
      }

      // Paso 2: Insertar en orders con payload condicional
      const orderPayload = {
        user_id: user ? user.id : null,
        total_amount_usd: finalTotal,
        status: paypalDetails ? 'paid' : 'pending_payment',
        user_name: formData.name.trim() || (user ? (user.name || user.user_metadata?.full_name) : ''),
        user_email: (user ? user.email : formData.email) || formData.email || '',
        user_phone: formData.phone.trim()
      };

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([orderPayload])
        .select()
        .single();

      if (orderError) throw new Error(`Fallo al crear la orden: ${orderError.message}`);
      
      const newOrderId = orderData.id;

      // Actualizar status de la orden correspondiente a 'paid' si es PayPal (acción consecutiva requerida)
      if (paypalDetails) {
        const { error: updateOrderError } = await supabase
          .from('orders')
          .update({ status: 'paid' })
          .eq('id', newOrderId);
        
        if (updateOrderError) throw new Error(`Fallo al actualizar el estado de la orden a pagada: ${updateOrderError.message}`);
      }

      // Paso 3: Insertar en order_items
      if (cartItems && cartItems.length > 0) {
        const orderItemsToInsert = cartItems.map(item => {
          const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
          
          let realProductId = null;
          if (isUUID(item.product_id)) realProductId = item.product_id;
          else if (isUUID(item.id)) realProductId = item.id;
          else if (isUUID(item.uuid)) realProductId = item.uuid;
          
          if (!realProductId) {
            throw new Error('Producto sin ID detectado');
          }

          return {
            order_id: newOrderId,
            product_id: realProductId,
            quantity: item.quantity,
            price_at_purchase_usd: item.salePrice || item.price
          };
        });

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItemsToInsert);

        if (itemsError) throw new Error(`Fallo al insertar los productos de la orden: ${itemsError.message}`);
      }

      // Paso 4: Insertar en payments
      let defaultPaymentMethodId = null;
      try {
        const { data: pmData } = await supabase
          .from('payment_methods')
          .select('id')
          .eq('name', paymentMethod)
          .maybeSingle();
        if (pmData) defaultPaymentMethodId = pmData.id;
      } catch (e) {
        console.warn('Could not retrieve payment_method_id:', e);
      }

      const { error: paymentError } = await supabase
        .from('payments')
        .insert([{
          order_id: newOrderId,
          payment_method_id: defaultPaymentMethodId,
          amount_paid: finalTotal,
          currency: 'USD',
          reference_number: paypalDetails ? paypalDetails.id : (formData.referenceNumber || 'N/A'),
          proof_image_url: uploadedReceiptUrl,
          status: paypalDetails ? 'completed' : 'pending_verification'
        }]);

      if (paymentError) throw new Error(`Fallo al registrar el pago: ${paymentError.message}`);

      // 5. Guardar datos ANTES de limpiar carrito (para la pantalla de éxito)
      const totalToSave = finalTotal;
      const refCode = newOrderId.slice(-6).toUpperCase();
      setSavedTotal(totalToSave);
      setOrderRefCode(refCode);
      setIsSuccess(true);
      clearCart();
    } catch (err) {
      console.error('Error in processCheckout:', err);
      showError(`Fallo en el proceso de compra: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContactFields = () => {
    return (
      <div className="contact-fields-section" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <h3 className="section-title">Datos de Contacto</h3>
        <div className="form-group">
          <label className="form-label">Nombre Completo</label>
          <div className="input-with-icon">
            <User size={18} className="input-icon" />
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Tu nombre y apellido"
              className="form-input"
              required
            />
          </div>
          {!user && formData.name.trim() !== '' && formData.name.trim().split(/\s+/).filter(Boolean).length < 2 && (
            <p className="form-help-text warning-text" style={{ color: '#dc3545', fontSize: '0.8rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
              <AlertCircle size={12} /> Por favor, introduce tu nombre y apellido (mínimo dos palabras).
            </p>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Correo electrónico</label>
          <div className="input-with-icon">
            <Mail size={18} className="input-icon" />
            <input
              type="email"
              name="email"
              value={user ? user.email : formData.email}
              onChange={handleInputChange}
              placeholder="tu@email.com"
              className="form-input"
              required
              disabled={!!user}
            />
          </div>
          {user ? (
            <p className="form-help-text success-text" style={{ color: '#28a745', fontSize: '0.8rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
              <CheckCircle size={12} /> Sesión iniciada como <strong>{user.email}</strong>. Tu orden se guardará en tu cuenta.
            </p>
          ) : (
            <p className="form-help-text info-text" style={{ color: '#4f6ef7', fontSize: '0.8rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
              <AlertCircle size={12} /> Campo obligatorio. Escribe tu correo para recibir el comprobante de tu compra.
            </p>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Teléfono</label>
          <div className="input-with-icon">
            <Phone size={18} className="input-icon" />
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="+58 424-000-0000"
              className="form-input"
              required
            />
          </div>
          <p className="form-help-text info-text" style={{ color: '#4f6ef7', fontSize: '0.8rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
            <AlertCircle size={12} /> Campo obligatorio. Ej: +58 424-1234567 o 04241234567.
          </p>
        </div>
      </div>
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await processCheckout();
  };

  const handleSuccessClose = () => {
    setIsSuccess(false);
    onClose();
  };

  const paymentMethods = [
    { id: 'zelle', name: 'Zelle' },
    { id: 'pago-movil', name: 'Pago Móvil' },
    { id: 'binance', name: 'Binance Pay' },
    { id: 'paypal', name: 'PayPal' },
    { id: 'tarjeta', name: 'Tarjeta' }
  ];



  const contentVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", damping: 25, stiffness: 300 } },
    exit: { y: -20, opacity: 0, transition: { duration: 0.2 } }
  };

  const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || "test";

  return (
    <PayPalScriptProvider options={{ "client-id": paypalClientId, currency: "USD" }}>
      <motion.div
        className="checkout-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
      <motion.div
        className="checkout-container"
        variants={contentVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          className="checkout-close"
          onClick={onClose}
          aria-label="Cerrar modal"
        >
          <X size={24} />
        </button>

        {isSuccess ? (
          <motion.div 
            className="checkout-success"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring" }}
          >
            {/* Confetti particles */}
            <div className="success-confetti">
              {CONFETTI_PARTICLES.map((particle, i) => (
                <motion.div
                  key={i}
                  className="confetti-particle"
                  initial={{ y: -20, x: 0, opacity: 1, scale: 0 }}
                  animate={{
                    y: particle.y,
                    x: particle.x,
                    opacity: [0, 1, 1, 0],
                    scale: [0, 1, 1, 0.5],
                    rotate: particle.rotate
                  }}
                  transition={{
                    duration: particle.duration,
                    delay: particle.delay,
                    ease: "easeOut"
                  }}
                  style={{
                    background: ['#28a745', '#ffd700', '#1e225e', '#0066cc', '#ff6b6b', '#a855f7'][i % 6],
                    width: particle.width,
                    height: particle.height,
                    borderRadius: i % 2 === 0 ? '50%' : '2px'
                  }}
                />
              ))}
            </div>

            {/* Animated check icon with glow ring */}
            <motion.div 
              className="success-icon-wrapper"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2, damping: 10, stiffness: 160 }}
            >
              <motion.div
                className="success-icon-ring"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: [0.6, 1.3, 1], opacity: [0, 0.6, 0.15] }}
                transition={{ duration: 2, delay: 0.4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
              />
              <div className="success-icon">
                <CheckCircle size={48} strokeWidth={2.2} />
              </div>
            </motion.div>

            <motion.h2 
              className="success-title"
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
            >
              ¡Gracias por tu orden!
            </motion.h2>
            <motion.p 
              className="success-subtitle"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.45 }}
            >
              Tu pedido ha sido registrado con éxito. En breve validaremos tu pago y te notificaremos por correo electrónico el estado de tu compra.
            </motion.p>
            
            {/* Summary Card */}
            <motion.div 
              className="success-summary-card"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.55, type: "spring", damping: 20 }}
            >
              <div className="success-summary-header">
                <Sparkles size={18} />
                <span>Resumen de tu pedido</span>
              </div>
              <div className="success-summary-body">
                <div className="success-summary-row">
                  <span className="success-summary-label">Número de Orden</span>
                  <span className="success-summary-value success-ref-code">#{orderRefCode}</span>
                </div>
                <div className="success-summary-divider" />
                <div className="success-summary-row">
                  <span className="success-summary-label">Método de Pago</span>
                  <span className="success-summary-value">
                    <span className="success-payment-badge">{paymentMethod.toUpperCase()}</span>
                  </span>
                </div>
                <div className="success-summary-divider" />
                <div className="success-summary-row success-total-row">
                  <span className="success-summary-label">Total a transferir</span>
                  <span className="success-summary-value success-total-amount price-container">
                    <span className="currency-symbol">$</span>
                    <span className="price-value">{savedTotal.toFixed(2)}</span>
                  </span>
                </div>
              </div>
            </motion.div>

            <motion.button 
              className="checkout-success-btn"
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.65 }}
              onClick={handleSuccessClose}
            >
              <ShoppingBag size={20} />
              <span>Volver a la Tienda</span>
              <ArrowRight size={18} />
            </motion.button>
          </motion.div>
        ) : (
          <div className="checkout-content">
            <div className="checkout-header">
              <h2 className="checkout-title">Checkout</h2>
              <p className="checkout-subtitle">Completa tu orden de compra</p>
            </div>

            <div className="checkout-body">
              {/* Payment Method Selection */}
              <motion.div 
                className="payment-methods"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h3 className="section-title">Método de Pago</h3>
                <div className="payment-grid">
                  {paymentMethods.map((method) => (
                    <label 
                      key={method.id}
                      className={`payment-method-card payment-option-card ${paymentMethod === method.id ? 'active' : ''}`}
                      onClick={() => setPaymentMethod(method.id)}
                    >
                      <input 
                        type="radio" 
                        name="payment" 
                        value={method.id}
                        checked={paymentMethod === method.id}
                        onChange={() => setPaymentMethod(method.id)}
                        className="hidden-radio"
                      />
                      <div className="payment-option-icon">
                        {renderPaymentIcon(method.id)}
                      </div>
                      <span className="payment-option-name">{method.name}</span>
                      {paymentMethod === method.id && (
                        <motion.div 
                          className="payment-option-check"
                          layoutId="check"
                        >
                          <CheckCircle size={16} />
                        </motion.div>
                      )}
                    </label>
                  ))}
                </div>
              </motion.div>

              {/* Payment Details Form */}
              <motion.div 
                className="payment-details"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <h3 className="section-title">Detalles de Pago</h3>
                
                {(paymentMethod === 'paypal' || paymentMethod === 'tarjeta') ? (
                  <div className="other-payment-methods">
                    {renderContactFields()}

                    <div className="payment-instruction mb-4">
                      <div className="instruction-icon">
                        <CheckCircle size={24} />
                      </div>
                      <div className="instruction-text">
                        {paymentMethod === 'tarjeta' ? (
                          <>
                            <h4>Pago con Tarjeta</h4>
                            <p>Completa tu pago de forma segura con tarjeta de crédito o débito a través de PayPal.</p>
                          </>
                        ) : (
                          <>
                            <h4>Pago con PayPal</h4>
                            <p>Completa tu pago usando tu cuenta de PayPal o tu tarjeta de débito/crédito.</p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="payment-details-form">
                      {isContactInfoValid ? (
                        <div className="paypal-button-container">
                          <PayPalButtons 
                            style={{ layout: "vertical", shape: "pill" }}
                            createOrder={(data, actions) => {
                              return actions.order.create({
                                purchase_units: [{ amount: { value: finalTotal.toFixed(2) } }]
                              });
                            }}
                            onApprove={async (data, actions) => {
                              setIsSubmitting(true);
                              try {
                                const details = await actions.order.capture();
                                await processCheckout(details);
                              } catch (err) {
                                console.error('PayPal capture or database sync error:', err);
                                showError('Error al procesar el pago con PayPal: ' + (err.message || err));
                                setIsSubmitting(false);
                              }
                            }}
                            onError={(err) => {
                              console.error('PayPal error:', err);
                              showError('Ocurrió un error con el servicio de PayPal.');
                              setIsSubmitting(false);
                            }}
                            onCancel={() => {
                              showError('El pago con PayPal fue cancelado.');
                              setIsSubmitting(false);
                            }}
                          />
                        </div>
                      ) : (
                        <div className="payment-validation-warning" style={{ background: 'rgba(239, 68, 68, 0.08)', borderLeft: '4px solid #ef4444', padding: '1rem', borderRadius: '8px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: '600', marginTop: '1rem' }}>
                          <AlertCircle size={18} />
                          <span>Por favor, completa tus datos de contacto arriba para habilitar el pago de PayPal.</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <form className="payment-details-form" onSubmit={handleSubmit}>
                    {renderContactFields()}

                    <div className="payment-instruction mb-4">
                      <div className="instruction-icon">
                        <CheckCircle size={24} />
                      </div>
                      <div className="instruction-text">
                        <h4>Reporte de Pago</h4>
                        <p>Ingresa los datos de tu transferencia y sube el comprobante para validar tu orden.</p>
                      </div>
                    </div>

                    <div className="payment-instructions-box">
                      {paymentMethod === 'pago-movil' && (
                        <div className="ves-amount-instruction mb-4">
                          <p>
                            Monto a transferir: <strong>
                              <span className="price-container">
                                <span className="currency-symbol">Bs.</span>
                                <span className="price-value">{(finalTotal * exchangeRate).toFixed(2)}</span>
                              </span>
                            </strong>
                          </p>
                        </div>
                      )}
                    </div>

                    {/* ── Instrucciones de pago SRX (Binance / Pago Móvil / Zelle) ── */}
                    {(paymentMethod === 'binance' || paymentMethod === 'pago-movil' || paymentMethod === 'zelle') && (
                      <PaymentInstructions
                        paymentMethod={paymentMethod}
                      />
                    )}

                    <div className="form-group">
                      <label className="form-label">
                        {paymentMethod === 'binance' 
                          ? 'ID de Transacción Binance' 
                          : paymentMethod === 'pago-movil' 
                            ? 'Número de Referencia Pago Móvil' 
                            : 'Número de Referencia'}
                      </label>
                      <div className="input-with-icon">
                        <Shield size={18} className="input-icon" />
                        <input
                          type="text"
                          name="referenceNumber"
                          value={formData.referenceNumber}
                          onChange={handleInputChange}
                          placeholder={
                            paymentMethod === 'binance' 
                              ? 'Ej: 284719284' 
                              : paymentMethod === 'pago-movil' 
                                ? 'Ej: 1234' 
                                : 'Ej: 123456789'
                          }
                          className="form-input"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Comprobante (Capture)</label>
                      <div className="file-upload-container">
                        <input
                          type="file"
                          id="receiptFile"
                          name="receiptFile"
                          accept="image/*"
                          onChange={handleInputChange}
                          className="file-input-hidden"
                          required
                        />
                        <label htmlFor="receiptFile" className="file-upload-label">
                          <Upload size={20} />
                          <span>{formData.receiptFile ? formData.receiptFile.name : 'Subir Imagen'}</span>
                        </label>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="checkout-submit-btn mt-4"
                      disabled={isSubmitting || !formData.referenceNumber || !formData.receiptFile || !isContactInfoValid}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="loading-spinner-small"></span>
                          <span>Procesando pago...</span>
                        </>
                      ) : (
                        <>
                          <Lock size={20} />
                          <span>Confirmar Pago por </span>
                          <span className="price-container" style={{ color: 'inherit' }}>
                            <span className="currency-symbol">$</span>
                            <span className="price-value">{finalTotal.toFixed(2)}</span>
                          </span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </motion.div>
            </div>

            {/* Order Summary */}
            <motion.div 
              className="order-summary"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h3 className="summary-title">Resumen del Pedido</h3>
              


              <div className="summary-items">
                {cartItems.map((item) => {
                  const price = item.salePrice || item.price;
                  return (
                    <div key={item.id} className="summary-item">
                      <div className="summary-item-info">
                        <img src={item.image} alt={item.name} className="summary-item-image" />
                        <div className="summary-item-details">
                          <h4 className="summary-item-name">{item.name}</h4>
                          <span className="summary-item-qty">x{item.quantity}</span>
                        </div>
                      </div>
                      <span className="summary-item-price price-container">
                        <span className="currency-symbol">$</span>
                        <span className="price-value">{(price * item.quantity).toFixed(2)}</span>
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Contenedor minimalista y elegante para el cupón */}
              <div className="coupon-section">
                <div className="coupon-input-group">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Ingresa tu cupón"
                    className="coupon-input"
                  />
                  <button
                    type="button"
                    onClick={validateCoupon}
                    className="coupon-btn"
                  >
                    Aplicar
                  </button>
                </div>
                {couponError && (
                  <span className="coupon-message error" style={{ color: '#dc3545', fontSize: '0.85rem', marginTop: '0.5rem', display: 'block', fontWeight: '500' }}>
                    {couponError}
                  </span>
                )}
                {couponSuccess && (
                  <span className="coupon-message success" style={{ color: '#28a745', fontSize: '0.85rem', marginTop: '0.5rem', display: 'block', fontWeight: '500' }}>
                    {couponSuccess}
                  </span>
                )}
              </div>

              <div className="summary-totals">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span className="price-container">
                    <span className="currency-symbol">$</span>
                    <span className="price-value">{cartTotal.toFixed(2)}</span>
                  </span>
                </div>
                {appliedDiscount > 0 && (
                  <div className="summary-row discount-row" style={{ color: '#28a745', fontWeight: '500' }}>
                    <span>Descuento ({appliedDiscount}%):</span>
                    <span className="price-container discount-price" style={{ color: '#28a745' }}>
                      <span className="currency-symbol">-$</span>
                      <span className="price-value">{discountAmount.toFixed(2)}</span>
                    </span>
                  </div>
                )}

                <div className="summary-row total">
                  <span>Total</span>
                  <span className="price-container total-price">
                    <span className="currency-symbol">$</span>
                    <span className="price-value">{finalTotal.toFixed(2)}</span>
                  </span>
                </div>
              </div>

              <div className="security-badges">
                <div className="security-item">
                  <Shield size={16} />
                  <span>Pago 100% Seguro</span>
                </div>
                <div className="security-item">
                  <Lock size={16} />
                  <span>Encriptación SSL</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </motion.div>
    </PayPalScriptProvider>
  );
}