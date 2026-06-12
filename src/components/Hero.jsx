import { useState, useEffect } from 'react';
import { products } from '../data/products';
import { motion } from 'framer-motion';
import { ArrowRight, Star, ShoppingCart, Search } from 'lucide-react';
import { useCart } from '../context/CartContext';
import './Hero.css';

const banners = [
  {
    id: 1,
    pc: '/SRX-Tech-Ecommerce/imagenes/dji mic mini banner srx tech (2).webp',
    movil: '/SRX-Tech-Ecommerce/imagenes/dji mic mini banner srx tech (2).webp'
  },
  {
    id: 2,
    pc: '/SRX-Tech-Ecommerce/imagenes/Osmo Action 4 SRX Tech banner (2).webp',
    movil: '/SRX-Tech-Ecommerce/imagenes/Osmo Action 4 SRX Tech banner mobile.jpg.webp'
  },
  {
    id: 3,
    pc: '/SRX-Tech-Ecommerce/imagenes/osmo pocket 3 banner srx tech (1).webp',
    movil: '/SRX-Tech-Ecommerce/imagenes/osmo pocket 3 banner srx tech mobile.jpg.webp'
  }
];

export default function Hero() {
  const { addToCart } = useCart();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroSearch, setHeroSearch] = useState('');

  const heroProduct = products?.find(p => p.isHero) || products?.[0] || {
    price: 0,
    salePrice: 0,
    rating: 5.0,
    tagline: 'Lo mejor en tecnología',
    name: 'Producto Destacado'
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const bannerActual = banners[currentSlide];

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
      const tienda = document.getElementById('tienda');
      if (tienda) tienda.scrollIntoView({ behavior: 'smooth' });
      setHeroSearch('');
    }
  };

  return (
    <section className="hero-wrapper hero-section">
      {/* === Background Image === */}
      <div className="hero-slide-container">
        <picture>
          <source media="(max-width: 768px)" srcSet={bannerActual.movil} />
          <img src={bannerActual.pc} alt="Banner Destacado" className="hero-bg-image" />
        </picture>
        {/* === Cinematic Gradient Overlay === */}
        <div className="hero-bg-overlay" />
      </div>

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
