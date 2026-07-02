import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Compass } from 'lucide-react';
import './NotFound.css';

export default function NotFound() {
  return (
    <div className="notfound-container">
      {/* Background elements */}
      <div className="notfound-bg-decoration dec-1"></div>
      <div className="notfound-bg-decoration dec-2"></div>

      <motion.div 
        className="notfound-card glass-card"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 80, damping: 15 }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          style={{ color: 'var(--nav-bg)', marginBottom: '1.5rem' }}
        >
          <Compass size={64} strokeWidth={1.5} />
        </motion.div>

        <h1 className="notfound-code">404</h1>
        <h2 className="notfound-title">Página No Encontrada</h2>
        
        <p className="notfound-text">
          Lo sentimos, el enlace que has seguido no existe o ha sido movido a otra ubicación en SRX Tech.
        </p>

        <Link to="/">
          <motion.button 
            className="notfound-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft size={18} />
            <span>Volver al Inicio</span>
          </motion.button>
        </Link>
      </motion.div>
    </div>
  );
}
