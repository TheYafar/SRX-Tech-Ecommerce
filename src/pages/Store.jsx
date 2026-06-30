import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { X, Grid, Smartphone, Search, Star } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { supabase } from '../utils/supabaseClient';
import { getNavFilter, clearNavFilter } from '../components/Navbar';
import './Store.css';

// ─────────────────────────────────────────────────────────────────────────────
//  Etiquetas amigables para el tipo de filtro activo
// ─────────────────────────────────────────────────────────────────────────────
const FILTER_ICONS = { category: Grid, device: Smartphone, search: Search };
const FILTER_LABELS = {
  category: 'Categoría',
  device:   'Equipo',
  search:   'Búsqueda',
};

export default function Store() {
  const [products, setProducts]         = useState([]);
  const [categories, setCategories]     = useState([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  // ── Query param: filter=best_sellers ─────────────────────────────────────
  const [searchParams, setSearchParams] = useSearchParams();
  const isBestSellersFilter = searchParams.get('filter') === 'best_sellers';

  // Limpiar el filtro URL de best_sellers
  const clearBestSellersFilter = useCallback(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('filter');
      return next;
    });
    setSelectedCategory('Todos');
  }, [setSearchParams]);

  // ── Filtro de navegación (mega menú) ─────────────────────────────────────
  const [navFilter, setNavFilterState] = useState(() => getNavFilter());

  // Escuchar cambios del sessionStorage (cuando el usuario hace clic en el menú)
  useEffect(() => {
    const onNavFilter = () => setNavFilterState(getNavFilter());
    window.addEventListener('srx_nav_filter_change', onNavFilter);
    return () => window.removeEventListener('srx_nav_filter_change', onNavFilter);
  }, []);

  // ── Fetch de datos ────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*, categories(name)')
          .eq('is_active', true);
        if (productsError) throw productsError;

        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*');
        if (categoriesError) throw categoriesError;

        const mappedProducts = (productsData || []).map(p => ({
          ...p,
          category: p.categories?.name || ''
        }));

        setProducts(mappedProducts);
        setCategories(categoriesData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  // ── Limpiar filtro de navegación ──────────────────────────────────────────
  const clearFilter = useCallback(() => {
    clearNavFilter();
    setNavFilterState(null);
    setSelectedCategory('Todos');
    // También limpiar best_sellers si está activo
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('filter');
      return next;
    });
  }, [setSearchParams]);

  // ── Filtrado combinado en memoria ─────────────────────────────────────────
  const filteredProducts = (() => {
    let result = [...products];

    // Filtro por más vendidos (query param URL) — máxima prioridad
    if (isBestSellersFilter) {
      return result.filter(p => p.is_best_seller === true);
    }

    // Filtro por categoría (pill filter clásico)
    if (selectedCategory !== 'Todos' && !navFilter) {
      result = result.filter(p => p.category_id === selectedCategory);
    }

    // Filtro por mega menú
    if (navFilter) {
      if (navFilter.type === 'category') {
        result = result.filter(p => p.category_id === navFilter.value);
      } else if (navFilter.type === 'device') {
        result = result.filter(p =>
          Array.isArray(p.compatible_devices) &&
          p.compatible_devices.some(d =>
            d.toLowerCase().includes(navFilter.value.toLowerCase())
          )
        );
      } else if (navFilter.type === 'search') {
        const q = navFilter.value.toLowerCase();
        result = result.filter(p => {
          const name = (p.name || '').toLowerCase();
          const desc = (p.description || '').toLowerCase();
          const tagline = (p.tagline || '').toLowerCase();
          return name.includes(q) || desc.includes(q) || tagline.includes(q);
        });
      }
    }

    return result;
  })();

  // ── Detectar el nombre del filtro activo para mostrarlo ───────────────────
  const activeFilterLabel = (() => {
    if (!navFilter) return null;
    if (navFilter.type === 'category') {
      const cat = categories.find(c => c.id === navFilter.value);
      return cat?.name || navFilter.value;
    }
    return navFilter.value;
  })();
  const ActiveFilterIcon = navFilter ? FILTER_ICONS[navFilter.type] : null;

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100, damping: 12 } },
  };

  return (
    <div className="store-page">
      {/* Premium Hero Section */}
      <section className="store-hero">
        <motion.div className="hero-orb orb-1" animate={{ x: [0, 30, 0], y: [0, -40, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div className="hero-orb orb-2" animate={{ x: [0, -40, 0], y: [0, 30, 0] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }} />

        <div className="container relative z-10">
          <motion.div
            className="store-hero-content glass-hero-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <motion.span className="store-hero-badge" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
              Colección Exclusiva
            </motion.span>
            <h1 className="store-hero-title">
              Eleva tu <span className="text-gradient-hero">Visión</span>
            </h1>
            <p className="store-hero-subtitle">
              Descubre nuestra selección premium de equipos fotográficos y de video de nivel profesional.
            </p>
            <motion.button
              className="hero-cta-btn"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' })}
            >
              Explorar Catálogo
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Products Section */}
      <section id="catalog" className="store-products-section">
        <div className="container">
          <div className="store-products-header">
            <motion.div
              className="section-header"
              initial={{ opacity: 0, y: -20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <span className="section-subtitle">NUESTRO CATÁLOGO</span>
              <h2 className="section-title">
                {isBestSellersFilter
                  ? '⭐ Más Vendidos'
                  : navFilter
                    ? `Filtrado: ${activeFilterLabel}`
                    : selectedCategory === 'Todos'
                      ? 'Todos los productos'
                      : 'Productos filtrados'}
              </h2>
            </motion.div>

            {/* ── Chip: filtro best_sellers desde URL ── */}
            {isBestSellersFilter && (
              <motion.div
                className="active-nav-filter-chip"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <Star size={13} />
                <span>Filtro: <strong>Más Vendidos</strong></span>
                <button className="chip-clear-btn" onClick={clearBestSellersFilter} aria-label="Limpiar filtro más vendidos">
                  <X size={13} />
                </button>
              </motion.div>
            )}

            {/* ── Active nav-filter chip ── */}
            {!isBestSellersFilter && navFilter && (
              <motion.div
                className="active-nav-filter-chip"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {ActiveFilterIcon && <ActiveFilterIcon size={13} />}
                <span>{FILTER_LABELS[navFilter.type]}: <strong>{activeFilterLabel}</strong></span>
                <button className="chip-clear-btn" onClick={clearFilter} aria-label="Limpiar filtro">
                  <X size={13} />
                </button>
              </motion.div>
            )}

            {/* Premium Pill Filter — solo visible si no hay nav-filter ni best_sellers activo */}
            {!navFilter && !isBestSellersFilter && (
              <motion.div
                className="pill-filter-container"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <div className="pill-filter-scroll">
                  <button
                    className={`filter-pill-btn ${selectedCategory === 'Todos' ? 'active' : ''}`}
                    onClick={() => setSelectedCategory('Todos')}
                  >
                    Todos
                    {selectedCategory === 'Todos' && (
                      <motion.div layoutId="activePill" className="active-pill-bg" transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
                    )}
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      className={`filter-pill-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(cat.id)}
                    >
                      {cat.name}
                      {selectedCategory === cat.id && (
                        <motion.div layoutId="activePill" className="active-pill-bg" transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {isLoading ? (
            <div className="products-premium-grid">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div key={n} className="product-card skeleton" style={{ height: '380px' }}>
                  <div style={{ height: '240px', width: '100%' }}></div>
                  <div style={{ padding: '20px' }}>
                    <div className="skeleton" style={{ height: '20px', width: '80%', marginBottom: '12px' }}></div>
                    <div className="skeleton" style={{ height: '14px', width: '50%', marginBottom: '20px' }}></div>
                    <div className="skeleton" style={{ height: '44px', width: '100%', borderRadius: 'var(--radius-full)' }}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <motion.div
              className="products-premium-grid"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
            >
              {filteredProducts.map((producto) => {
                const mappedProduct = {
                  ...producto,
                  name: producto.name,
                  price: producto.price_usd,
                  image: producto.images_urls?.[0],
                };
                return (
                  <motion.div key={producto.id} variants={itemVariants}>
                    <ProductCard product={mappedProduct} />
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              className="empty-state-container"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <div className="empty-state-card">
                <motion.div
                  className="empty-state-icon-ring"
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
                >
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 7h-9" />
                    <path d="M14 17H5" />
                    <circle cx="17" cy="17" r="3" />
                    <circle cx="7" cy="7" r="3" />
                  </svg>
                </motion.div>

                <motion.h3 className="empty-state-title" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                  {navFilter
                    ? 'No hay productos que coincidan con este filtro.'
                    : 'Aún no hay productos en esta categoría.'}
                </motion.h3>

                <motion.p className="empty-state-subtitle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                  ¡Vuelve pronto para ver novedades!
                </motion.p>

                <motion.button
                  className="btn-catalog-premium"
                  onClick={clearFilter}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  ← Ver todos los productos
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Back to Home Link */}
          <motion.div
            className="back-to-home-wrapper"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Link to="/" className="back-to-home-link premium-back-link">
              <span className="back-arrow">←</span> Volver al inicio
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}