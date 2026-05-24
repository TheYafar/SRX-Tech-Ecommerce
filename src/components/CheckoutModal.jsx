import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { X, CreditCard, Shield, CheckCircle, ChevronRight, Lock, User, Mail, Phone, MapPin, Calendar, Upload, Smartphone } from 'lucide-react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { supabase, uploadReceipt } from '../utils/supabaseClient';
import './CheckoutModal.css';

export default function CheckoutModal({ isOpen, onClose }) {
  const { cartItems, cartTotal, clearCart, checkout } = useCart();
  const { user } = useAuth();
  const { formatUSD, formatVES, isLoading } = useCurrency();
  const [paymentMethod, setPaymentMethod] = useState('zelle');
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    setIsSubmitting(true);
    console.log("🛒 [CheckoutModal:processCheckout] Iniciando procesamiento de pedido...", {
      paymentMethod,
      total: finalTotal,
      userEmail: user?.email,
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
          user_id: user.id,
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

      // 5. Actualizar estado y limpiar carrito
      setOrderId(newOrderId);
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
    if (!user || !user.id) {
      alert('Debes iniciar sesión para comprar');
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
    { id: 'zelle', name: 'Zelle', type: 'image', src: '/imagen/zelle.png', color: '#0066cc' },
    { id: 'pago-movil', name: 'Pago Móvil', type: 'icon', color: '#28a745' },
    { id: 'binance', name: 'Binance Pay', type: 'image', src: '/imagen/binance.png', color: '#fcd535' },
    { id: 'paypal', name: 'PayPal', type: 'image', src: '/imagen/paypal.png', color: '#003087' },
    { id: 'tarjeta', name: 'Tarjeta', type: 'icon', color: '#1e225e' }
  ];

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
                      <div className="payment-option-icon text-slate-700">
                        {method.type === 'image' ? (
                          <img 
                            src={method.src} 
                            alt={method.name}
                            className="w-12 h-12 object-contain"
                          />
                        ) : method.id === 'pago-movil' ? (
                          <Smartphone size={32} color={method.color} />
                        ) : (
                          <CreditCard size={32} color={method.color} />
                        )}
                      </div>
                      <span className="payment-option-name text-slate-800 font-bold">{method.name}</span>
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
                              return actions.order.capture().then((details) => {
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
                      className="checkout-submit-btn mt-4"
                      disabled={isSubmitting || !formData.referenceNumber || !formData.receiptFile}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="loading-spinner-small"></span>
                          <span>Procesando pago...</span>
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