import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { X, CreditCard, Shield, CheckCircle, ChevronRight, Lock, User, Mail, Phone, MapPin, Calendar, Upload } from 'lucide-react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { supabase, uploadReceipt } from '../utils/supabaseClient';
import './CheckoutModal.css';

export default function CheckoutModal({ isOpen, onClose }) {
  const { cartItems, cartTotal, clearCart, checkout } = useCart();
  const { user } = useAuth();
  const { formatUSD, formatVES, isLoading } = useCurrency();
  const [paymentMethod, setPaymentMethod] = useState('zelle');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');
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
    setIsProcessing(true);
    console.log("🛒 [CheckoutModal:processCheckout] Iniciando procesamiento de pedido...", {
      paymentMethod,
      total: finalTotal,
      userEmail: user?.email,
      hasReceipt: !!formData.receiptFile
    });

    let uploadedReceiptUrl = null;

    // 1. Subir comprobante a Supabase Storage si se adjuntó uno
    if (formData.receiptFile) {
      console.log('🚀 [CheckoutModal:processCheckout] Subiendo comprobante a Supabase Storage...', formData.receiptFile);
      try {
        uploadedReceiptUrl = await uploadReceipt(formData.receiptFile);
        if (uploadedReceiptUrl) {
          console.log('✅ [CheckoutModal:processCheckout] Comprobante subido exitosamente. URL:', uploadedReceiptUrl);
        } else {
          console.error('❌ [CheckoutModal:processCheckout] Falló la subida del comprobante a Supabase.');
        }
      } catch (err) {
        console.error('💥 [CheckoutModal:processCheckout] Excepción al subir comprobante:', err);
      }
    }

    // 2. Simular latencia de red para procesar el pago
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Crear orden localmente en localStorage mediante context
    const generatedId = checkout(paymentMethod, user?.email);
    console.log(`📦 [CheckoutModal:processCheckout] Orden creada localmente con ID: ${generatedId}`);

    // 4. Registrar pago en la tabla 'payments' de Supabase para la aprobación del administrador
    try {
      console.log(`✍️ [CheckoutModal:processCheckout] Insertando registro en tabla 'payments' de Supabase para aprobación del administrador...`);
      const { data, error: insertError } = await supabase
        .from('payments')
        .insert([
          {
            order_id: generatedId,
            amount: finalTotal,
            payment_method: paymentMethod,
            user_id: user?.id || null,
            proof_image_url: uploadedReceiptUrl,
            status: 'pending'
          }
        ]);

      if (insertError) {
        console.error('❌ [CheckoutModal:processCheckout] Error al insertar en tabla payments de Supabase:', {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code
        });
      } else {
        console.log('✅ [CheckoutModal:processCheckout] Pago registrado exitosamente en la base de datos de Supabase.');
      }
    } catch (err) {
      console.error('💥 [CheckoutModal:processCheckout] Excepción al registrar el pago en la base de datos:', err);
    }

    // 5. Actualizar estado y limpiar carrito
    setOrderId(generatedId);
    setIsSuccess(true);
    clearCart();
    setIsProcessing(false);
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    console.log("🖱️ [CheckoutModal:handleCheckout] Checkout iniciado por envío de formulario.");
    await processCheckout();
  };

  const handleSuccessClose = () => {
    setIsSuccess(false);
    onClose();
  };

  const paymentMethods = [
    { id: 'zelle', name: 'Zelle', logo: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iOTAiIGhlaWdodD0iOTAiIHJ4PSIxNSIgZmlsbD0iIzAwNjZjYyIvPjx0ZXh0IHg9IjQ1IiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjIwIiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlllbGxlPC90ZXh0Pjwvc3ZnPg==', color: '#0066cc' },
    { id: 'pago-movil', name: 'Pago Móvil', logo: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iOTAiIGhlaWdodD0iOTAiIHJ4PSIxNSIgZmlsbD0iIzI4YTc0NyIvPjx0ZXh0IHg9IjQ1IiB5PSI0MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlBBR088L3RleHQ+PHRleHQgeD0iNDUiIHk9IjU1IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTAiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+T1bDkk1OPC90ZXh0Pjwvc3ZnPg==', color: '#28a745' },
    { id: 'binance', name: 'Binance Pay', logo: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iOTAiIGhlaWdodD0iOTAiIHJ4PSIxNSIgZmlsbD0iI2ZjZDMzNSIvPjx0ZXh0IHg9IjQ1IiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0iIzE4MWEyMCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+QklOQU5DRTwvdGV4dD48dGV4dCB4PSI0NSIgeT0iNjUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSI4IiBmaWxsPSIjMTgxYTIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5QQUY8L3RleHQ+PC9zdmc+', color: '#fcd535' },
    { id: 'paypal', name: 'PayPal', logo: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iOTAiIGhlaWdodD0iOTAiIHJ4PSIxNSIgZmlsbD0iIzAwMzA4NyIvPjx0ZXh0IHg9IjQ1IiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlBheVBhbDwvdGV4dD48L3N2Zz4=', color: '#003087' },
    { id: 'tarjeta', name: 'Tarjeta', logo: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iOTAiIGhlaWdodD0iOTAiIHJ4PSIxNSIgZmlsbD0iIzFlMjI1ZSIvPjxyZWN0IHg9IjIwIiB5PSIzNSIgd2lkdGg9IjUwIiBoZWlnaHQ9IjMwIiByeT0iNSIgZmlsbD0id2hpdGUiIG9wYWNpdHk9IjAuMiIvPjxyZWN0IHg9IjIwIiB5PSIzNSIgd2lkdGg9IjI1IiBoZWlnaHQ9IjMwIiByeT0iNSIgZmlsbD0id2hpdGUiIG9wYWNpdHk9IjAuMyIvPjx0ZXh0IHg9IjQ1IiB5PSI3NSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkjDkk1JVk088L3RleHQ+PC9zdmc+', color: '#1e225e' }
  ];

  const getPaymentLogo = (methodId) => {
    const logos = {
      'zelle': 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iOTAiIGhlaWdodD0iOTAiIHJ4PSIxNSIgZmlsbD0iIzAwNjZjYyIvPjx0ZXh0IHg9IjQ1IiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjIwIiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlllbGxlPC90ZXh0Pjwvc3ZnPg==',
      'pago-movil': 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iOTAiIGhlaWdodD0iOTAiIHJ4PSIxNSIgZmlsbD0iIzI4YTc0NyIvPjx0ZXh0IHg9IjQ1IiB5PSI0MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlBBR088L3RleHQ+PHRleHQgeD0iNDUiIHk9IjU1IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTAiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+T1bDkk1OPC90ZXh0Pjwvc3ZnPg==',
      'binance': 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iOTAiIGhlaWdodD0iOTAiIHJ4PSIxNSIgZmlsbD0iI2ZjZDMzNSIvPjx0ZXh0IHg9IjQ1IiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0iIzE4MWEyMCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+QklOQU5DRTwvdGV4dD48dGV4dCB4PSI0NSIgeT0iNjUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSI4IiBmaWxsPSIjMTgxYTIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5QQUY8L3RleHQ+PC9zdmc+',
      'paypal': 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iOTAiIGhlaWdodD0iOTAiIHJ4PSIxNSIgZmlsbD0iIzAwMzA4NyIvPjx0ZXh0IHg9IjQ1IiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlBheVBhbDwvdGV4dD48L3N2Zz4=',
      'tarjeta': 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iOTAiIGhlaWdodD0iOTAiIHJ4PSIxNSIgZmlsbD0iIzFlMjI1ZSIvPjxyZWN0IHg9IjIwIiB5PSIzNSIgd2lkdGg9IjUwIiBoZWlnaHQ9IjMwIiByeT0iNSIgZmlsbD0id2hpdGUiIG9wYWNpdHk9IjAuMiIvPjxyZWN0IHg9IjIwIiB5PSIzNSIgd2lkdGg9IjI1IiBoZWlnaHQ9IjMwIiByeT0iNSIgZmlsbD0id2hpdGUiIG9wYWNpdHk9IjAuMyIvPjx0ZXh0IHg9IjQ1IiB5PSI3NSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkjDkk1JVk088L3RleHQ+PC9zdmc+'
    };
    return logos[methodId] || '';
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
    exit: { opacity: 0, transition: { duration: 0.2 } }
  };

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
            <motion.div 
              className="success-icon"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
            >
              <CheckCircle size={64} />
            </motion.div>
            <h2 className="success-title">¡Pedido Confirmado!</h2>
            <p className="success-subtitle">Tu orden ha sido procesada exitosamente.</p>
            
            <div className="order-details">
              <div className="order-row">
                <span className="order-label">ID del Pedido:</span>
                <span className="order-value">{orderId}</span>
              </div>
              <div className="order-row">
                <span className="order-label">Método de Pago:</span>
                <span className="order-value payment-tag">{paymentMethod.toUpperCase()}</span>
              </div>
              <div className="order-row">
                <span className="order-label">Monto Total:</span>
                <span className="order-value total">${finalTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="success-instructions">
              <p>Te hemos enviado las instrucciones de pago a tu correo. Por favor, reporta tu capture una vez realizada la transferencia.</p>
            </div>

            <motion.button 
              className="success-btn"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSuccessClose}
            >
              Continuar Comprando
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
                        <img 
                          src={getPaymentLogo(method.id)} 
                          alt={method.name}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
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
                
                {paymentMethod === 'tarjeta' ? (
                  <form className="card-payment-form" onSubmit={handleCheckout}>
                    <div className="form-group">
                      <label className="form-label">Nombre en la tarjeta</label>
                      <div className="input-with-icon">
                        <User size={18} className="input-icon" />
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="Nombre completo"
                          className="form-input"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Número de tarjeta</label>
                      <div className="input-with-icon">
                        <CreditCard size={18} className="input-icon" />
                        <input
                          type="text"
                          name="cardNumber"
                          value={formData.cardNumber}
                          onChange={handleInputChange}
                          placeholder="0000 0000 0000 0000"
                          className="form-input"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Fecha de expiración</label>
                        <div className="input-with-icon">
                          <Calendar size={18} className="input-icon" />
                          <input
                            type="text"
                            name="cardExpiry"
                            value={formData.cardExpiry}
                            onChange={handleInputChange}
                            placeholder="MM/YY"
                            className="form-input"
                            required
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">CVC</label>
                        <div className="input-with-icon">
                          <Shield size={18} className="input-icon" />
                          <input
                            type="text"
                            name="cardCvc"
                            value={formData.cardCvc}
                            onChange={handleInputChange}
                            placeholder="123"
                            className="form-input"
                            required
                          />
                        </div>
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
                      <label className="form-label">Dirección de envío</label>
                      <div className="input-with-icon">
                        <MapPin size={18} className="input-icon" />
                        <input
                          type="text"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          placeholder="Dirección completa"
                          className="form-input"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Ciudad</label>
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          placeholder="Ciudad"
                          className="form-input"
                          required
                        />
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
                    </div>

                    <button 
                      type="submit"
                      className="checkout-submit-btn"
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <span className="loading-spinner-small"></span>
                      ) : (
                        <>
                          <Lock size={20} />
                          <span>Confirmar Pago por ${finalTotal.toFixed(2)}</span>
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="other-payment-methods">
                    <div className="payment-instruction">
                      <div className="instruction-icon">
                        <CheckCircle size={24} />
                      </div>
                      <div className="instruction-text">
                        <h4>Procedimiento de Pago</h4>
                        <p>Después de confirmar tu pedido, te enviaremos las instrucciones de pago a tu correo electrónico.</p>
                      </div>
                    </div>

                    <div className="payment-details-form">
                      {paymentMethod === 'paypal' ? (
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
                                return actions.order.capture().then((details) => {
                                  processCheckout();
                                });
                              }}
                            />
                          </PayPalScriptProvider>
                        </div>
                      ) : (
                        <>
                          <div className="payment-instructions-box">
                            {paymentMethod === 'pago-movil' && (
                              <div className="ves-amount-instruction">
                                <p>Monto a transferir: <strong>{formatVES(finalTotal)}</strong></p>
                              </div>
                            )}
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

                          <button 
                            type="button"
                            className="checkout-submit-btn"
                            onClick={processCheckout}
                            disabled={isProcessing || !formData.referenceNumber || !formData.receiptFile}
                          >
                            {isProcessing ? (
                              <span className="loading-spinner-small"></span>
                            ) : (
                              <>
                                <span>Confirmar Pago</span>
                                <ChevronRight size={20} />
                              </>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
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