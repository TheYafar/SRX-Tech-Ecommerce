import { useState } from 'react';
import { motion } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { X, CreditCard, Shield, CheckCircle, Lock, User, Mail, Phone, Upload, Smartphone, ShoppingBag, ArrowRight, Sparkles } from 'lucide-react';
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

export default function CheckoutModal({ isOpen, onClose }) {
  const { cartItems, cartTotal, clearCart } = useCart();
  const { user, openAuthModalWithAction } = useAuth();
  const { formatVES } = useCurrency();
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
  const [discount, setDiscount] = useState(0);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');

  const finalTotal = Math.max(0, cartTotal - discount);

  if (!isOpen) return null;

  // 🔐 GUARDIA NIVEL COMPONENTE — Si no hay sesión activa, cerrar modal inmediatamente.
  // Esto evita que usuarios manipulen el estado de React directamente desde DevTools.
  if (!user) {
    console.warn('🚨 [CheckoutModal] Render bloqueado: sin sesión activa. Cerrando modal.');
    onClose();
    return null;
  }

  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const applyCoupon = () => {
    if (!couponCode) {
      setCouponError('Ingresa un código válido');
      return;
    }
    // Lógica simulada de cupones
    if (couponCode.toUpperCase() === 'DESCUENTO10') {
      setDiscount(cartTotal * 0.10);
      setCouponSuccess('¡Cupón del 10% aplicado!');
      setCouponError('');
    } else if (couponCode.toUpperCase() === 'MENOS5') {
      setDiscount(5);
      setCouponSuccess('¡Cupón de $5 aplicado!');
      setCouponError('');
    } else {
      setDiscount(0);
      setCouponError('Cupón inválido o expirado');
      setCouponSuccess('');
    }
  };

  const processCheckout = async () => {
    // ====================================================================
    // 🔐 INTERCEPTOR INFRANQUEABLE — Validación de sesión obligatoria
    // Este bloque es la última línea de defensa antes de tocar Supabase.
    // Cualquier intento de encargo sin sesión activa es detenido aquí.
    // ====================================================================
    if (!user) {
      console.error('🚨 [CheckoutModal:processCheckout] INTERCEPTADO: Intento de encargo sin sesión activa. Flujo detenido.');
      // Abrir AuthModal con acción pendiente para retomar el encargo post-login
      openAuthModalWithAction(
        () => {}, // No re-ejecutar checkout automáticamente; el usuario debe confirmar de nuevo
        'Debes iniciar sesión para confirmar tu encargo',
        'login'
      );
      onClose();
      return; // ⛔ SALIDA OBLIGATORIA — no se ejecuta nada más
    }

    setIsSubmitting(true);
    console.log("🛒 [CheckoutModal:processCheckout] Iniciando procesamiento de pedido...", {
      paymentMethod,
      total: finalTotal,
      userEmail: user.email,
      hasReceipt: !!formData.receiptFile
    });

    let uploadedReceiptUrl = null;

    try {
      // Paso 1: Subir el comprobante a Supabase Storage
      if (formData.receiptFile) {
        console.log('🚀 [CheckoutModal:processCheckout] Subiendo comprobante a Supabase Storage...', formData.receiptFile);
        uploadedReceiptUrl = await uploadReceipt(formData.receiptFile);
        if (!uploadedReceiptUrl) {
          throw new Error('No se pudo subir la imagen del comprobante o no se generó una dirección pública.');
        }
        console.log('✅ [CheckoutModal:processCheckout] Comprobante subido exitosamente. URL:', uploadedReceiptUrl);
      }

      // Paso 2: Insertar en orders
      console.log('📦 [CheckoutModal:processCheckout] Creando orden en tabla orders...');
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          user_id: user?.id || null,
          total_amount_usd: finalTotal,
          status: 'pending_payment'
        }])
        .select()
        .single();

      if (orderError) throw new Error(`Fallo al crear la orden: ${orderError.message}`);
      
      const newOrderId = orderData.id;
      console.log(`✅ [CheckoutModal:processCheckout] Orden creada con ID: ${newOrderId}`);

      // Paso 3: Insertar en order_items
      if (cartItems && cartItems.length > 0) {
        console.log('🛍️ [CheckoutModal:processCheckout] Insertando items de la orden...');
        const orderItemsToInsert = cartItems.map(item => {
          // 1. Mapeo estricto: Obtener el UUID real (priorizamos product_id, luego id)
          // Verificamos que sea un UUID válido y no un slug.
          const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
          
          let realProductId = null;
          if (isUUID(item.product_id)) realProductId = item.product_id;
          else if (isUUID(item.id)) realProductId = item.id;
          else if (isUUID(item.uuid)) realProductId = item.uuid;
          
          if (!realProductId) {
            throw new Error('Producto sin ID detectado');
          }

          // 3. Limpieza: Solo enviamos las columnas que existen en la tabla order_items
          return {
            order_id: newOrderId,
            product_id: realProductId,
            quantity: item.quantity,
            price_at_purchase_usd: item.salePrice || item.price
          };
        });

        // 2. Debug de seguridad: Imprimir datos antes del insert
        console.log('Datos a insertar:', orderItemsToInsert);

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItemsToInsert);

        if (itemsError) throw new Error(`Fallo al insertar los productos de la orden: ${itemsError.message}`);
        console.log('✅ [CheckoutModal:processCheckout] Items de la orden insertados correctamente.');
      }

      // Paso 4: Insertar en payments
      console.log(`✍️ [CheckoutModal:processCheckout] Insertando registro en tabla payments...`);
      
      // Intentar obtener payment_method_id por nombre, si no, se va como null y se asume fallback
      let defaultPaymentMethodId = null;
      try {
        const { data: pmData } = await supabase
          .from('payment_methods')
          .select('id')
          .eq('name', paymentMethod)
          .maybeSingle();
        if (pmData) defaultPaymentMethodId = pmData.id;
      } catch (e) {
        console.warn('⚠️ No se pudo obtener un payment_method_id.', e);
      }

      const { error: paymentError } = await supabase
        .from('payments')
        .insert([{
          order_id: newOrderId,
          payment_method_id: defaultPaymentMethodId, // En el esquema debe estar o null funciona si no lo requieren forzoso
          amount_paid: finalTotal,
          currency: 'USD',
          reference_number: formData.referenceNumber || 'N/A',
          proof_image_url: uploadedReceiptUrl,
          status: 'pending_verification'
        }]);

      if (paymentError) throw new Error(`Fallo al registrar el pago: ${paymentError.message}`);

      console.log('✅ [CheckoutModal:processCheckout] Pago registrado exitosamente en la base de datos.');

      // 5. Guardar datos ANTES de limpiar carrito (para la pantalla de éxito)
      const totalToSave = finalTotal;
      const refCode = newOrderId.slice(-6).toUpperCase();
      setSavedTotal(totalToSave);
      setOrderRefCode(refCode);
      setIsSuccess(true);
      clearCart();
    } catch (err) {
      console.error('💥 [CheckoutModal:processCheckout] Excepción en el flujo de checkout:', err);
      alert(`Fallo en el proceso de compra: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // 🔐 Doble-check antes de procesar el formulario
    if (!user) {
      console.error('🚨 [CheckoutModal:handleSubmit] INTERCEPTADO: Submit sin sesión. Redirigiendo a AuthModal.');
      openAuthModalWithAction(
        () => {},
        'Debes iniciar sesión para confirmar tu encargo',
        'login'
      );
      onClose();
      return;
    }
    console.log("🖱️ [CheckoutModal:handleSubmit] Checkout iniciado por envío de formulario.");
    await processCheckout();
  };

  const handleSuccessClose = () => {
    setIsSuccess(false);
    onClose();
  };

  const paymentMethods = [
    { id: 'zelle', name: 'Zelle', type: 'image', src: '/imagenes/zelle.png', color: '#0066cc' },
    { id: 'pago-movil', name: 'Pago Móvil', type: 'icon', color: '#28a745' },
    { id: 'binance', name: 'Binance Pay', type: 'image', src: '/imagenes/binance.png', color: '#fcd535' },
    { id: 'paypal', name: 'PayPal', type: 'image', src: '/imagenes/paypal.png', color: '#003087' },
    { id: 'tarjeta', name: 'Tarjeta', type: 'icon', color: '#1e225e' }
  ];



  const contentVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", damping: 25, stiffness: 300 } },
    exit: { y: -20, opacity: 0, transition: { duration: 0.2 } }
  };

  return (
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
                  <span className="success-summary-value success-total-amount">${savedTotal.toFixed(2)}</span>
                </div>
              </div>
            </motion.div>

            <motion.button 
              className="success-btn"
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
                      className={`payment-option-card ${paymentMethod === method.id ? 'active' : ''}`}
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
                        {method.type === 'image' ? (
                          <img 
                            src={method.src} 
                            alt={method.name}
                            className="payment-method-img"
                          />
                        ) : method.id === 'pago-movil' ? (
                          <Smartphone size={32} color={method.color} />
                        ) : (
                          <CreditCard size={32} color={method.color} />
                        )}
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
                
                {paymentMethod === 'paypal' ? (
                  <div className="other-payment-methods">
                    <div className="payment-instruction mb-4">
                      <div className="instruction-icon">
                        <CheckCircle size={24} />
                      </div>
                      <div className="instruction-text">
                        <h4>Pago con PayPal</h4>
                        <p>Completa tu pago usando el botón a continuación. Tu orden se procesará automáticamente.</p>
                      </div>
                    </div>
                    <div className="payment-details-form">
                      <div className="paypal-button-container">
                        <PayPalScriptProvider options={{ "client-id": "test", currency: "USD" }}>
                          <PayPalButtons 
                            style={{ layout: "vertical", shape: "pill" }}
                            createOrder={(data, actions) => {
                              return actions.order.create({
                                purchase_units: [{ amount: { value: finalTotal.toFixed(2) } }]
                              });
                            }}
                            onApprove={(data, actions) => {
                              return actions.order.capture().then(() => {
                                processCheckout();
                              });
                            }}
                          />
                        </PayPalScriptProvider>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form className="payment-details-form" onSubmit={handleSubmit}>
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
                          <p>Monto a transferir: <strong>{formatVES(finalTotal)}</strong></p>
                        </div>
                      )}
                    </div>

                    {/* ── Instrucciones de pago SRX (Binance / Pago Móvil) ── */}
                    {(paymentMethod === 'binance' || paymentMethod === 'pago-movil') && (
                      <PaymentInstructions
                        paymentMethod={paymentMethod}
                      />
                    )}

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
                    </div>

                    <div className="form-group">
                      <label className="form-label">Correo electrónico</label>
                      <div className="input-with-icon">
                        <Mail size={18} className="input-icon" />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="tu@email.com"
                          className="form-input"
                          required
                        />
                      </div>
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
                    </div>

                    <div className="form-group">
                      <label className="form-label">Número de Referencia</label>
                      <div className="input-with-icon">
                        <Shield size={18} className="input-icon" />
                        <input
                          type="text"
                          name="referenceNumber"
                          value={formData.referenceNumber}
                          onChange={handleInputChange}
                          placeholder="Ej: 123456789"
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
                      className={`checkout-submit-btn mt-4 ${!user ? 'btn-auth-required' : ''}`}
                      disabled={isSubmitting || !formData.referenceNumber || !formData.receiptFile || !user}
                      title={!user ? 'Debes iniciar sesión para confirmar tu encargo' : ''}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="loading-spinner-small"></span>
                          <span>Procesando pago...</span>
                        </>
                      ) : !user ? (
                        <>
                          <Lock size={20} />
                          <span>Inicia sesión para confirmar</span>
                        </>
                      ) : (
                        <>
                          <Lock size={20} />
                          <span>Confirmar Pago por ${finalTotal.toFixed(2)}</span>
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
              
              <div className="coupon-section">
                <div className="coupon-input-group">
                  <input 
                    type="text" 
                    placeholder="Código de descuento" 
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="coupon-input"
                  />
                  <button type="button" onClick={applyCoupon} className="coupon-btn">Aplicar</button>
                </div>
                {couponError && <span className="coupon-message error">{couponError}</span>}
                {couponSuccess && <span className="coupon-message success">{couponSuccess}</span>}
              </div>

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
                      <span className="summary-item-price">${(price * item.quantity).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="summary-totals">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="summary-row discount-row">
                    <span>Descuento</span>
                    <span>-${discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="summary-row">
                  <span>Envío</span>
                  <span className="free-shipping">Gratis</span>
                </div>
                <div className="summary-row total">
                  <span>Total</span>
                  <span>${finalTotal.toFixed(2)}</span>
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
  );
}