import { useState, useEffect } from 'react';
import { products } from '../data/products';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Star } from 'lucide-react';
import './Hero.css';

/* =============================================
   SLIDES — Metadatos del Hero Slider
   Estructura limpia con rutas desktop + mobile
   ============================================= */
const slides = [
  {
    id: 1,
    productId: 'dji-mic-mini',
    title: "DJI Mic Mini",
    subtitle: "Audio ultra-compacto, sonido profesional",
    bgDesktop: "/SRX-Tech-Ecommerce/imagenes/dji mic mini banner srx tech (2).webp",
    bgMobile: "/SRX-Tech-Ecommerce/imagenes/mobile3.jpg",
    rating: 4.9
  },
  {
    id: 2,
    productId: 'dji-osmo-action-4',
    title: "DJI Osmo Action 4",
    subtitle: "Captura la acción sin límites",
    bgDesktop: "/SRX-Tech-Ecommerce/imagenes/Osmo Action 4 SRX Tech banner (2).webp",
    bgMobile: "/SRX-Tech-Ecommerce/imagenes/mobile2.jpg",
    rating: 4.8
  },
  {
    id: 3,
    productId: 'dji-osmo-pocket-3',
    title: "DJI Osmo Pocket 3",
    subtitle: "La cámara más versátil para creadores de la imagen",
    bgDesktop: "/SRX-Tech-Ecommerce/imagenes/osmo pocket 3 banner srx tech (1).webp",
    bgMobile: "/SRX-Tech-Ecommerce/imagenes/mobile1.jpg",
    rating: 5.0
  }
];

export default function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slide = slides[currentSlide];

  // Dynamic product mapping to fix the data rendering inconsistency
  const currentProduct = products?.find(p => p.id === slide.productId) || {
    price: 0,
    salePrice: 0,
    rating: slide.rating || 5.0,
    tagline: slide.subtitle,
    name: slide.title
  };

  /* Auto-advance slides every 5 seconds */
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);



  /* === Framer Motion Variants === */
  const badgeVariants = {
    hidden: { opacity: 0, scale: 0.6 },
    visible: (delay) => ({
      opacity: 1,
      scale: 1,
      transition: { delay, type: 'spring', stiffness: 200, damping: 15 }
    })
  };

  const textVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { delay: 0.3, duration: 0.7, ease: 'easeOut' }
    }
  };



  return (
    <section className="hero-wrapper hero-section hero-slider-container">
      {/* === Background Image — <picture> responsivo === */}
      <div className="hero-background-wrapper">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            className="hero-slide-bg-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
          >
            <picture>
              {/* En pantallas ≤ 768px carga la variante móvil vertical */}
              <source media="(max-width: 768px)" srcSet={slide.bgMobile} />
              {/* Por defecto (desktop), carga la imagen horizontal */}
              <img
                src={slide.bgDesktop}
                alt={slide.title}
                className="hero-background-img"
              />
            </picture>
          </motion.div>
        </AnimatePresence>
        {/* === Cinematic Gradient Overlay === */}
        <div className="hero-bg-overlay" />
      </div>

      {/* === Hero Content Layer — z-index: 2 sobre la imagen === */}
      <div className="hero-content">
        {/* === Floating Badges === */}


        <motion.div
          className="hero-badge rating-badge"
          custom={1.1}
          variants={badgeVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ scale: 1.08 }}
        >
          <Star size={14} fill="#ffd700" color="#ffd700" />
          <span className="badge-rating">{currentProduct.rating}</span>
          <span className="badge-reviews">/ 5.0</span>
        </motion.div>

        {/* === Real HTML Text Layer (Accessibility + UX) === */}


        {/* === Bottom Controls Container === */}
        <div className="bottom-controls-container">
          {/* === Bottom Tagline Pill === */}
          <motion.div
            className="cta-button-pill"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, type: 'spring', stiffness: 120, damping: 18 }}
          >
            <span>{slide.subtitle}</span>
            <motion.div
              animate={{ x: [0, 6, 0] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            >
              <ArrowRight size={16} />
            </motion.div>
          </motion.div>

          {/* === Slide Indicators / Pagination Dots === */}
          <div className="pagination-dots">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                className={`hero-indicator ${idx === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(idx)}
                aria-label={`Ir a slide ${idx + 1}: ${s.title}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* === Ambient Background Circles === */}
      <div className="hero-background-elements" aria-hidden="true">
        <motion.div
          className="bg-circle circle-1"
          animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="bg-circle circle-2"
          animate={{ y: [0, 15, 0], x: [0, -15, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
      </div>
    </section>
  );
}
