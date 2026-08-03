import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCart, getEffectivePrice } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { useNotifications } from '../context/NotificationContext';
import { X, CreditCard, Shield, CheckCircle, AlertCircle, Lock, User, Mail, Phone, Upload, Smartphone, ShoppingBag, ArrowRight, Sparkles } from 'lucide-react';
import { supabase, uploadReceipt } from '../utils/supabaseClient';
import PaymentInstructions from './PaymentInstructions';
import InternationalCardForm from './InternationalCardForm';
import { enviarCorreoCompraExitosa } from '../services/emailService';
import { checkAndValidateCoupon, registerCouponUsage } from '../services/couponService';
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
    case 'pago-movil':
      return <Smartphone size={24} stroke="currentColor" strokeWidth={2} />;
    case 'tarjeta':
      return <CreditCard size={24} stroke="currentColor" strokeWidth={2} />;
    case 'paypal':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.5 7.2c.4.7.4 1.7 0 2.8-.7 1.8-2.3 2.9-4.3 2.9h-1.8l-.8 4.6H8.2l2.3-13.7h5.1c1.2 0 2.2.4 2.8 1.4z" />
          <path d="M15.5 9.2c.4.7.4 1.7 0 2.8-.7 1.8-2.3 2.9-4.3 2.9h-1.8l-.8 4.6H6.2l2.3-13.7h5.1c1.2 0 2.2.4 2.8 1.4z" opacity="0.6" />
        </svg>
      );
    default:
      return null;
  }
};

export default function CheckoutModal({ isOpen, onClose }) {
  const { cartItems, cartTotal = 0, clearCart } = useCart();
  const { user } = useAuth();
  const { exchangeRate } = useCurrency();
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
    cardName: '',
    cardNumber: '',
    cardExpiry: '',
    cardCvc: '',
    cardZip: '',
    referenceNumber: '',
    receiptFile: null
  });
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [appliedCouponId, setAppliedCouponId] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');

  const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

  const filteredCartItems = (cartItems || []).reduce((acc, item) => {
    if (!item) return acc;
    let realProductId = null;
    const candidateId = item.id || item.product_id || item._id;
    if (isUUID(candidateId)) realProductId = candidateId;
    else if (isUUID(item.uuid)) realProductId = item.uuid;
    
    if (realProductId) {
      acc.push({
        ...item,
        product_id: realProductId
      });
    }
    return acc;
  }, []);

  const calculatedSubtotal = filteredCartItems.length > 0
    ? filteredCartItems.reduce((sum, item) => {
        const price = getEffectivePrice(item);
        return sum + (price * (item.quantity || 1));
      }, 0)
    : (cartTotal || 0);

  const discountAmount = Number((calculatedSubtotal * (appliedDiscount / 100)).toFixed(2));
  const baseTotal = Math.max(0, Number((calculatedSubtotal - discountAmount).toFixed(2)));
  const finalTotal = baseTotal;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isContactInfoValid = 
    (user 
      ? formData.name.trim() !== '' 
      : (formData.name.trim().split(/\s+/).filter(Boolean).length >= 2)
    ) && 
    (user ? true : emailRegex.test(formData.email.trim())) && 
    formData.phone.trim() !== '';

  const isCardValid = Boolean(
    formData.cardName && formData.cardName.trim().length >= 3 &&
    formData.cardNumber && formData.cardNumber.replace(/\s/g, '').length >= 15 &&
    formData.cardExpiry && formData.cardExpiry.length === 5 &&
    formData.cardCvc && formData.cardCvc.length >= 3
  );

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
      setAppliedCouponId(null);
      setCouponSuccess('');
      return;
    }
    try {
      setCouponError('');
      setCouponSuccess('');

      const result = await checkAndValidateCoupon(couponCode, user?.id || null);

      if (!result.success) {
        setCouponError(result.message || 'Cupón inválido o inactivo');
        setAppliedDiscount(0);
        setAppliedCouponId(null);
        return;
      }

      const percent = result.coupon.discount_percent || result.coupon.discount_percentage || result.coupon.discount || 0;
      setAppliedDiscount(percent);
      setAppliedCouponId(result.coupon.id);
      setCouponSuccess(`¡Cupón del ${percent}% aplicado!`);
      setCouponError('');
    } catch (err) {
      console.error('Error validating coupon:', err);
      setCouponError('Error al validar cupón');
      setAppliedDiscount(0);
      setAppliedCouponId(null);
    }
  };

  const processCheckout = async () => {
    setIsSubmitting(true);
    let uploadedReceiptUrl = null;
    const isDirectCardPayment = paymentMethod === 'tarjeta';
    const cardTxnId = isDirectCardPayment 
      ? `INT-CARD-${Math.random().toString(36).substring(2, 10).toUpperCase()}` 
      : null;

    try {
      if (appliedCouponId) {
        const result = await checkAndValidateCoupon(couponCode, user?.id || null);
        if (!result.success) {
          throw new Error(result.message || 'El cupón ya no es válido.');
        }
      }

      // Paso 1: Subir comprobante si aplica (no se requiere para tarjeta directa)
      if (formData.receiptFile && !isDirectCardPayment) {
        uploadedReceiptUrl = await uploadReceipt(formData.receiptFile);
        if (!uploadedReceiptUrl) {
          throw new Error('No se pudo subir la imagen del comprobante o no se generó una dirección pública.');
        }
      }

      const cleanItems = filteredCartItems.length > 0
        ? filteredCartItems
        : (cartItems || []).reduce((acc, item) => {
            if (!item) return acc;
            let realProductId = null;
            const candidateId = item.id || item.product_id || item._id;
            if (isUUID(candidateId)) realProductId = candidateId;
            else if (isUUID(item.uuid)) realProductId = item.uuid;
            if (realProductId) acc.push({ ...item, product_id: realProductId });
            return acc;
          }, []);

      if (cleanItems.length === 0) {
        throw new Error('El carrito no contiene productos válidos.');
      }

      let dbProducts = null;
      try {
        const productIds = cleanItems.map(item => item.product_id);
        const { data, error: dbProductsError } = await supabase
          .from('products')
          .select('id, stock')
          .in('id', productIds);

        if (dbProductsError) throw dbProductsError;
        dbProducts = data;
      } catch (stockErr) {
        console.error('Error al determinar el tipo de pedido basado en el stock de Supabase:', stockErr);
      }

      const itemsContado = [];
      const itemsEncargo = [];

      cleanItems.forEach(item => {
        const matchedDbProduct = dbProducts?.find(p => p.id === item.product_id);
        const stockValue = (matchedDbProduct !== undefined && matchedDbProduct !== null && matchedDbProduct.stock !== undefined && matchedDbProduct.stock !== null)
          ? matchedDbProduct.stock
          : (item.stock !== undefined && item.stock !== null ? item.stock : 0);

        if (stockValue >= 1) {
          itemsContado.push(item);
        } else {
          itemsEncargo.push(item);
        }
      });

      if (itemsContado.length > 0) {
        const exceedsStock = itemsContado.some(item => {
          const matchedDbProduct = dbProducts?.find(p => p.id === item.product_id);
          const stockValue = (matchedDbProduct !== undefined && matchedDbProduct !== null && matchedDbProduct.stock !== undefined && matchedDbProduct.stock !== null) ? matchedDbProduct.stock : item.stock;
          return item.quantity > stockValue;
        });

        if (exceedsStock) {
          const errorMsg = "No se puede pedir más de este producto, solo queda 1 unidad disponible. Si quiere pedir otra, compre 1 y pida las demás por encargo.";
          showError(errorMsg);
          setIsSubmitting(false);
          return;
        }
      }

      const createSingleOrder = async (items, orderType, totalAmount) => {
        const orderPayload = {
          user_id: user ? user.id : null,
          total_amount_usd: totalAmount,
          status: isDirectCardPayment ? 'paid' : 'pending_payment',
          user_name: formData.name.trim() || (user ? (user.name || user.user_metadata?.full_name) : ''),
          user_email: (user ? user.email : formData.email) || formData.email || '',
          user_phone: formData.phone.trim(),
          order_type: orderType
        };

        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .insert([orderPayload])
          .select()
          .single();

        if (orderError) throw new Error(`Fallo al crear la orden (${orderType}): ${orderError.message}`);
        
        const newOrderId = orderData.id;

        if (orderType === 'contado') {
          try {
            await Promise.all(
              items.map(async (item) => {
                const { data: prodData, error: prodError } = await supabase
                  .from('products')
                  .select('stock')
                  .eq('id', item.product_id)
                  .single();

                if (!prodError && prodData) {
                  const currentStock = prodData.stock != null ? prodData.stock : 0;
                  const newStock = Math.max(0, currentStock - (item.quantity || 1));
                  await supabase
                    .from('products')
                    .update({ stock: newStock })
                    .eq('id', item.product_id);
                }
              })
            );
          } catch (stockUpdateErr) {
            console.error('Error al descontar stock de los productos:', stockUpdateErr);
          }
        }

        const orderItemsToInsert = items.map(item => {
          const effectivePrice = getEffectivePrice(item);
          return {
            order_id: newOrderId,
            product_id: item.product_id,
            quantity: item.quantity,
            price_at_purchase_usd: effectivePrice
          };
        });

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItemsToInsert);

        if (itemsError) throw new Error(`Fallo al insertar los productos de la orden (${orderType}): ${itemsError.message}`);

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

        const refNum = isDirectCardPayment ? cardTxnId : (formData.referenceNumber || 'N/A');

        const { error: paymentError } = await supabase
          .from('payments')
          .insert([{
            order_id: newOrderId,
            payment_method_id: defaultPaymentMethodId,
            amount_paid: totalAmount,
            currency: 'USD',
            reference_number: refNum,
            proof_image_url: uploadedReceiptUrl,
            status: isDirectCardPayment ? 'completed' : 'pending_verification'
          }]);

        if (paymentError) throw new Error(`Fallo al registrar el pago (${orderType}): ${paymentError.message}`);

        return newOrderId;
      };

      const createdOrders = [];

      if (itemsContado.length > 0) {
        const subtotalContado = itemsContado.reduce((sum, item) => {
          const price = getEffectivePrice(item);
          return sum + (price * (item.quantity || 1));
        }, 0);
        const discountContado = Number((subtotalContado * (appliedDiscount / 100)).toFixed(2));
        const totalContado = Math.max(0, Number((subtotalContado - discountContado).toFixed(2)));

        const orderId = await createSingleOrder(itemsContado, 'contado', totalContado);
        createdOrders.push({ id: orderId, type: 'contado' });
      }

      if (itemsEncargo.length > 0) {
        const subtotalEncargo = itemsEncargo.reduce((sum, item) => {
          const price = getEffectivePrice(item);
          return sum + (price * (item.quantity || 1));
        }, 0);
        const discountEncargo = Number((subtotalEncargo * (appliedDiscount / 100)).toFixed(2));
        const totalEncargo = Math.max(0, Number((subtotalEncargo - discountEncargo).toFixed(2)));

        const orderId = await createSingleOrder(itemsEncargo, 'encargo', totalEncargo);
        createdOrders.push({ id: orderId, type: 'encargo' });
      }

      if (createdOrders.length === 0) {
        throw new Error('No se pudo registrar ninguna orden.');
      }

      if (appliedCouponId) {
        await registerCouponUsage(appliedCouponId, user?.id || null);
      }

      const totalToSave = finalTotal;
      const refCode = createdOrders.map(o => o.id.slice(-6).toUpperCase()).join(' / #');
      setSavedTotal(totalToSave);
      setOrderRefCode(refCode);

      const emailPayload = {
        customer_email: (user ? user.email : formData.email) || formData.email || '',
        customer_name: formData.name.trim() || (user ? (user.name || user.user_metadata?.full_name) : 'Cliente'),
        customer_phone: formData.phone.trim(),
        order_ref: refCode,
        order_type: itemsContado.length > 0 && itemsEncargo.length > 0 ? 'mixto' : (itemsEncargo.length > 0 ? 'encargo' : 'contado'),
        payment_method: isDirectCardPayment ? 'Tarjeta Internacional' : paymentMethod,
        reference_number: isDirectCardPayment ? cardTxnId : (formData.referenceNumber || 'N/A'),
        items: cleanItems.map(item => ({
          name: item.name || item.title || 'Producto',
          quantity: item.quantity || 1,
          price: getEffectivePrice(item)
        })),
        subtotal: calculatedSubtotal,
        discount_percent: appliedDiscount,
        discount_amount: discountAmount,
        total: finalTotal
      };

      enviarCorreoCompraExitosa(emailPayload).catch(emailErr => {
        console.error('Error al enviar el correo de confirmación de compra:', emailErr);
      });

      showSuccess("¡Pago procesado con éxito! Tu orden ha sido registrada.");
      setIsSuccess(true);

      // Track Purchase event in Meta Pixel
      window.fbq = window.fbq || function() {
        (window.fbq.q = window.fbq.q || []).push(arguments);
      };
      if (window.fbq) {
        const eventData = {
          value: Number(totalToSave),
          currency: 'USD'
        };
        window.fbq('track', 'Purchase', eventData);
        console.log('[Meta Pixel] Evento disparado: Purchase', eventData);
      }

      clearCart();
      
      setTimeout(() => {
        window.location.reload();
      }, 5000);
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
    if (finalTotal <= 0) {
      showError('El monto total de la orden es cero. Revisa tu carrito antes de continuar.');
      return;
    }
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
    { id: 'tarjeta', name: 'Tarjeta Internacional', isMaintenance: true },
    { id: 'paypal', name: 'PayPal', isMaintenance: true }
  ];

  const contentVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", damping: 25, stiffness: 300 } },
    exit: { y: -20, opacity: 0, transition: { duration: 0.2 } }
  };

  const currentMethodObj = paymentMethods.find(m => m.id === paymentMethod);
  const isMaintenance = Boolean(currentMethodObj?.isMaintenance);

  const isSubmitDisabled = isMaintenance
    ? true
    : paymentMethod === 'tarjeta'
    ? (isSubmitting || !isContactInfoValid || !isCardValid || finalTotal <= 0)
    : (isSubmitting || ((paymentMethod === 'binance' || paymentMethod === 'pago-movil') && !formData.referenceNumber) || !formData.receiptFile || !isContactInfoValid || finalTotal <= 0);

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

            {/* Animated check icon */}
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
              Tu pedido ha sido registrado con éxito. En breve te notificaremos por correo electrónico el estado de tu compra.
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
                    <span className="success-payment-badge">{paymentMethod === 'tarjeta' ? 'TARJETA INTERNACIONAL' : paymentMethod.toUpperCase()}</span>
                  </span>
                </div>
                <div className="success-summary-divider" />
                <div className="success-summary-row success-total-row">
                  <span className="success-summary-label">Total Procesado</span>
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

            {/* 1. Método de Pago */}
            <motion.div 
              className="payment-methods"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h3 className="section-title">Método de Pago</h3>
              <div className="payment-grid">
                {paymentMethods.map((method) => (
                  <label 
                    key={method.id}
                    className={`payment-method-card payment-option-card ${paymentMethod === method.id ? 'active' : ''} ${method.isMaintenance ? 'is-maintenance' : ''}`}
                    onClick={() => setPaymentMethod(method.id)}
                  >
                    {method.isMaintenance && (
                      <span className="payment-method-badge-maintenance">Mantenimiento</span>
                    )}
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

            {/* 2. Datos de Contacto */}
            <motion.div 
              className="contact-details-section-container"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {renderContactFields()}
            </motion.div>

            {/* 3. Resumen del Pedido */}
            <motion.div 
              className="order-summary"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="summary-title">Resumen del Pedido</h3>
              
              <div className="summary-items">
                {filteredCartItems.map((item) => {
                  const price = getEffectivePrice(item);
                  return (
                    <div key={item.product_id} className="summary-item">
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

              {/* Cupón de descuento */}
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
                    <span className="price-value">{calculatedSubtotal.toFixed(2)}</span>
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

            {/* 4. Detalles de Pago */}
            <div className="checkout-body">
              <motion.div 
                className="payment-details"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <h3 className="section-title">Detalles de Pago</h3>
                
                <form className="payment-details-form" onSubmit={handleSubmit}>
                  {isMaintenance ? (
                    <div className="payment-maintenance-card">
                      <div className="payment-maintenance-header">
                        <div className="payment-maintenance-icon-badge">
                          <AlertCircle size={28} />
                        </div>
                        <div className="payment-maintenance-header-text">
                          <h4 className="payment-maintenance-title">
                            {paymentMethod === 'paypal' ? 'PayPal' : 'Tarjeta Internacional'} en Mantenimiento
                          </h4>
                          <span className="payment-maintenance-subtitle">
                            Servicio temporalmente deshabilitado
                          </span>
                        </div>
                      </div>
                      <div className="payment-maintenance-body">
                        <p className="payment-maintenance-text">
                          El método de pago con <strong>{paymentMethod === 'paypal' ? 'PayPal' : 'Tarjeta Internacional'}</strong> se encuentra en mantenimiento técnico para optimizar nuestros sistemas de verificación.
                        </p>
                        <div className="maintenance-alternatives-container">
                          <span className="alternatives-label">Te sugerimos utilizar nuestros métodos activos:</span>
                          <div className="alternatives-buttons-grid">
                            <button
                              type="button"
                              className="alt-method-btn"
                              onClick={() => setPaymentMethod('zelle')}
                            >
                              <span>Zelle</span>
                            </button>
                            <button
                              type="button"
                              className="alt-method-btn"
                              onClick={() => setPaymentMethod('pago-movil')}
                            >
                              <span>Pago Móvil</span>
                            </button>
                            <button
                              type="button"
                              className="alt-method-btn"
                              onClick={() => setPaymentMethod('binance')}
                            >
                              <span>Binance Pay</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : paymentMethod === 'tarjeta' ? (
                    <div className="international-card-section">
                      <InternationalCardForm
                        cardData={formData}
                        onChange={handleInputChange}
                      />
                    </div>
                  ) : (
                    <>
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

                      {/* Instrucciones de pago (Binance / Pago Móvil / Zelle) */}
                      <PaymentInstructions paymentMethod={paymentMethod} />

                      {(paymentMethod === 'binance' || paymentMethod === 'pago-movil') && (
                        <div className="form-group">
                          <label className="form-label">
                            {paymentMethod === 'binance' 
                              ? 'ID de Transacción Binance' 
                              : 'Número de Referencia Pago Móvil'}
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
                                  : 'Ej: 1234'
                              }
                              className="form-input"
                              required
                            />
                          </div>
                        </div>
                      )}

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
                    </>
                  )}

                  <button 
                    type="submit"
                    className="checkout-submit-btn mt-4"
                    disabled={isSubmitDisabled}
                  >
                    {isMaintenance ? (
                      <>
                        <AlertCircle size={20} />
                        <span>Método en Mantenimiento</span>
                      </>
                    ) : isSubmitting ? (
                      <>
                        <span className="loading-spinner-small"></span>
                        <span>Procesando pago con pasarela...</span>
                      </>
                    ) : finalTotal <= 0 ? (
                      <>
                        <AlertCircle size={20} />
                        <span>Cargando monto...</span>
                      </>
                    ) : (
                      <>
                        <Lock size={20} />
                        <span>{paymentMethod === 'tarjeta' ? 'Pagar con Tarjeta Internacional' : 'Confirmar Pago por '}</span>
                        <span className="price-container" style={{ color: 'inherit', marginLeft: '4px' }}>
                          <span className="currency-symbol">$</span>
                          <span className="price-value">{finalTotal.toFixed(2)}</span>
                        </span>
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}