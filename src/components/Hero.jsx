import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { products } from '../data/products';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Star, ShoppingCart, Search } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { setNavFilter } from './Navbar';
import './Hero.css';

/* =============================================
   SLIDES — Metadatos del Hero Slider
   Estructura limpia con rutas desktop + mobile
   ============================================= */
const slides = [
  {
    id: 1,
    title: "DJI Mic Mini",
    subtitle: "Audio ultra-compacto, sonido profesional",
    bgDesktop: "/SRX-Tech-Ecommerce/imagenes/dji mic mini banner srx tech (2).webp",
    bgMobile: "/SRX-Tech-Ecommerce/imagenes/mobile3.jpg"
  },
  {
    id: 2,
    title: "DJI Osmo Action 4",
    subtitle: "Captura la acción sin límites",
    bgDesktop: "/SRX-Tech-Ecommerce/imagenes/Osmo Action 4 SRX Tech banner (2).webp",
    bgMobile: "/SRX-Tech-Ecommerce/imagenes/mobile2.jpg"
  },
  {
    id: 3,
    title: "DJI Osmo Pocket 3",
    subtitle: "La cámara más versátil para creadores",
    bgDesktop: "/SRX-Tech-Ecommerce/imagenes/osmo pocket 3 banner srx tech (1).webp",
    bgMobile: "/SRX-Tech-Ecommerce/imagenes/mobile1.jpg"
  }
];

export default function Hero() {
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroSearch, setHeroSearch] = useState('');

  const heroProduct = products?.find(p => p.isHero) || products?.[0] || {
    price: 0,
    salePrice: 0,
    rating: 5.0,
    tagline: 'Lo mejor en tecnología',
    name: 'Producto Destacado'
  };

  /* Auto-advance slides every 5 seconds */
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const slide = slides[currentSlide];

  /* === Framer Motion Variants === */
  const badgeVariants = {
    hidden: { opacity: 0, scale: 0.6 },
    visible: (delay) => ({
      opacity: 1,
      scale: 1,
      transition: { delay, type: 'spring', stiffness: 200, damping: 15 }
    })
  };

  const ctaVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { delay: 0.6, type: 'spring', stiffness: 120, damping: 18 }
    }
  };

  const textVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { delay: 0.3, duration: 0.7, ease: 'easeOut' }
    }
  };

  const handleHeroSearch = (e) => {
    e.preventDefault();
    if (heroSearch.trim()) {
      setNavFilter({ type: 'search', value: heroSearch.trim() });
      navigate('/tienda');
      setHeroSearch('');
    }
  };

  return (
    <section className="hero-wrapper hero-section">
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
          className="hero-badge price-badge"
          custom={0.9}
          variants={badgeVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ scale: 1.08 }}
        >
          <span className="badge-label">OFERTA</span>
          <span className="badge-price">${heroProduct.salePrice?.toFixed(2) ?? '0.00'}</span>
          <span className="badge-original">${heroProduct.price?.toFixed(2) ?? '0.00'}</span>
        </motion.div>

        <motion.div
          className="hero-badge rating-badge"
          custom={1.1}
          variants={badgeVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ scale: 1.08 }}
        >
          <Star size={14} fill="#ffd700" color="#ffd700" />
          <span className="badge-rating">{heroProduct.rating}</span>
          <span className="badge-reviews">/ 5.0</span>
        </motion.div>

        {/* === Real HTML Text Layer (Accessibility + UX) === */}
        <motion.div
          className="hero-text-layer"
          variants={textVariants}
          initial="hidden"
          animate="visible"
        >
          <h1 className="hero-headline">
            {heroProduct.name || 'Tecnología Premium'}
          </h1>
          <p className="hero-subheadline">
            {heroProduct.tagline || 'Descubre lo último en innovación tecnológica para creadores'}
          </p>
        </motion.div>

        {/* === Bottom CTA Strip === */}
        <motion.div
          className="hero-cta-strip"
          variants={ctaVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Glassmorphism Search Bar */}
          <form className="hero-search-bar" onSubmit={handleHeroSearch}>
            <Search size={18} className="hero-search-icon" />
            <input
              type="text"
              className="hero-search-input"
              placeholder="Buscar productos, accesorios..."
              value={heroSearch}
              onChange={(e) => setHeroSearch(e.target.value)}
            />
          </form>

          <div className="hero-cta-tagline">
            <span>{heroProduct.tagline}</span>
            <motion.div
              animate={{ x: [0, 6, 0] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            >
              <ArrowRight size={16} />
            </motion.div>
          </div>

          <div className="hero-cta-actions">
            <motion.button
              className="hero-btn-discover"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const el = document.getElementById('tienda');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <span>Descubrir Producto</span>
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ArrowRight size={18} />
              </motion.div>
            </motion.button>

            <motion.button
              className="hero-btn-cart"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => addToCart(heroProduct)}
            >
              <ShoppingCart size={18} />
              <span>Añadir al carrito</span>
            </motion.button>
          </div>
        </motion.div>

        {/* === Slide Indicators === */}
        <div className="hero-slide-indicators">
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
