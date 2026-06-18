import { useState, useEffect } from 'react';
import { products } from '../data/products';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import './Hero.css';

export default function Hero() {
  const [slides, setSlides] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Fetch banners on mount
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const { data, error } = await supabase
          .from('banners')
          .select('*')
          .order('order_index', { ascending: true });
        if (error) throw error;
        setSlides(data || []);
      } catch (err) {
        console.error('Error al cargar banners en el Hero:', err);
      }
    };
    fetchBanners();
  }, []);

  /* Auto-advance slides every 5 seconds */
  useEffect(() => {
    if (slides.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) {
    return (
      <section className="hero-wrapper hero-section hero-slider-container">
        <div className="hero-background-wrapper">
          <div className="hero-bg-overlay" />
        </div>
        <div className="hero-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <p style={{ color: '#ffffff', fontSize: '1.1rem' }}>Cargando ofertas, u u a a...</p>
        </div>
      </section>
    );
  }

  const slide = slides[currentSlide];

  // Dynamic product mapping to fix the data rendering inconsistency
  const currentProduct = products?.find(p => p.id === slide.productId) || {
    price: 0,
    salePrice: 0,
    rating: slide.rating || 5.0,
    tagline: slide.subtitle,
    name: slide.title
  };

  /* === Framer Motion Variants === */
  const badgeVariants = {
    hidden: { opacity: 0, scale: 0.6 },
    visible: (delay) => ({
      opacity: 1,
      scale: 1,
      transition: { delay, type: 'spring', stiffness: 200, damping: 15 }
    })
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
              {slide.image_url_mobile && (
                <source media="(max-width: 768px)" srcSet={slide.image_url_mobile} />
              )}
              <img
                src={slide.image_url}
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

        {/* === Bottom Controls Container === */}
        <div className="bottom-controls-container">
          {/* === Bottom Tagline Pill === */}
          <Link to={slide.link_url || '/tienda'} style={{ textDecoration: 'none', pointerEvents: 'auto' }}>
            <motion.div
              className="cta-button-pill"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, type: 'spring', stiffness: 120, damping: 18 }}
              whileHover={{ scale: 1.05 }}
            >
              <span>{slide.subtitle}</span>
              <motion.div
                animate={{ x: [0, 6, 0] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              >
                <ArrowRight size={16} />
              </motion.div>
            </motion.div>
          </Link>

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
