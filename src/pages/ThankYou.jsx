import { useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, ShoppingBag, User, MessageCircle, Mail, PackageCheck, Clock } from 'lucide-react';
import { WHATSAPP_PHONE } from '../utils/whatsapp';
import './ThankYou.css';

export default function ThankYou() {
  const location = useLocation();
  const orderRef = location.state?.orderRef || null;
  const total = location.state?.total || null;

  useEffect(() => {
    // Scroll to top upon navigation
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.title = '¡Gracias por tu compra! | SRX Tech';
  }, []);

  const whatsappMessage = orderRef 
    ? `¡Hola! 👋 Acabo de realizar mi pedido (#${orderRef}) en SRX Tech y quisiera hacer seguimiento.`
    : '¡Hola! 👋 Acabo de realizar una compra en SRX Tech y quisiera consultar sobre mi pedido.';

  const whatsappUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="thankyou-container">
      {/* Background decorations */}
      <div className="thankyou-bg-decoration dec-1" />
      <div className="thankyou-bg-decoration dec-2" />

      <motion.div 
        className="thankyou-card"
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 90, damping: 18 }}
      >
        {/* Animated Check Icon */}
        <div className="thankyou-icon-wrapper">
          <motion.div 
            className="thankyou-icon-ring"
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0.15, 0.6] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div 
            className="thankyou-icon"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.15, stiffness: 200, damping: 15 }}
          >
            <CheckCircle2 size={44} strokeWidth={2.5} />
          </motion.div>
        </div>

        <motion.h1 
          className="thankyou-title"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          ¡Gracias por tu compra!
        </motion.h1>

        <motion.p 
          className="thankyou-subtitle"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          Tu pedido ha sido recibido con éxito. En breve nos pondremos en contacto contigo para coordinar la entrega o envío.
        </motion.p>

        {orderRef && (
          <motion.div 
            className="thankyou-order-badge"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <span>Código de Orden:</span>
            <strong>#{orderRef}</strong>
            {total && <span>• ${Number(total).toFixed(2)} USD</span>}
          </motion.div>
        )}

        {/* Informative Steps */}
        <motion.div 
          className="thankyou-steps"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className="thankyou-step-item">
            <div className="thankyou-step-icon">
              <Mail size={18} />
            </div>
            <div className="thankyou-step-content">
              <h4>Confirmación por Correo</h4>
              <p>Te enviamos un correo con los detalles completos y comprobante de la compra.</p>
            </div>
          </div>

          <div className="thankyou-step-item">
            <div className="thankyou-step-icon">
              <Clock size={18} />
            </div>
            <div className="thankyou-step-content">
              <h4>Verificación & Procesamiento</h4>
              <p>Nuestro equipo validará la información para despachar tu producto a la brevedad.</p>
            </div>
          </div>

          <div className="thankyou-step-item">
            <div className="thankyou-step-icon">
              <PackageCheck size={18} />
            </div>
            <div className="thankyou-step-content">
              <h4>Entrega o Envío Nacional</h4>
              <p>Coordinaremos contigo los datos de despacho o retiro en tienda física.</p>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <div className="thankyou-actions">
          <Link to="/tienda" className="thankyou-btn-primary">
            <ShoppingBag size={18} />
            <span>Continuar Comprando</span>
          </Link>

          <Link to="/profile" className="thankyou-btn-secondary">
            <User size={16} />
            <span>Ver Estado en mi Cuenta</span>
          </Link>

          <a 
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="thankyou-whatsapp-link"
          >
            <MessageCircle size={16} />
            <span>¿Tienes dudas? Escríbenos por WhatsApp</span>
          </a>
        </div>
      </motion.div>
    </div>
  );
}
