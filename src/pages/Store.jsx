import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link, useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { X, Grid, Smartphone, Search, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import ProductDetailModal from '../components/ProductDetailModal';
import { supabase } from '../utils/supabaseClient';
import { getNavFilter, clearNavFilter } from '../components/Navbar';
import { generateSlug } from '../utils/slugify';
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
  const { slug } = useParams();
  const navigate = useNavigate();
  const [products, setProducts]                 = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories]             = useState([]);
  const [isLoading, setIsLoading]               = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [activeProduct, setActiveProduct]       = useState(null);


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

  // ── Scroll container control and arrows state ──────────────────────────────
  const scrollContainerRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const checkScrollButtons = useCallback(() => {
    const container = scrollContainerRef.current;
    if (container) {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      setShowLeftArrow(scrollLeft > 2);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 2);
    }
  }, []);

  const handleScroll = (direction) => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollBy({ left: direction === 'left' ? -200 : 200, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollButtons);
      checkScrollButtons();
      window.addEventListener('resize', checkScrollButtons);

      const observer = new MutationObserver(checkScrollButtons);
      observer.observe(container, { childList: true, subtree: true });

      return () => {
        container.removeEventListener('scroll', checkScrollButtons);
        window.removeEventListener('resize', checkScrollButtons);
        observer.disconnect();
      };
    }
  }, [categories, navFilter, isBestSellersFilter, checkScrollButtons]);

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
        setFilteredProducts(mappedProducts);
        setCategories(categoriesData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  // ── Sincronizar producto seleccionado según el slug de la URL ─────────────
  useEffect(() => {
    if (!slug) {
      setActiveProduct(null);
      return;
    }

    // 1. Intentar buscar en la lista de productos ya cargados en memoria
    const foundLocal = products.find(
      (p) => p.slug === slug || generateSlug(p.name) === slug || String(p.id) === String(slug)
    );

    if (foundLocal) {
      const formattedLocal = {
        ...foundLocal,
        image: foundLocal.image || foundLocal.images_urls?.[0] || 'https://via.placeholder.com/150',
        price: foundLocal.price || foundLocal.price_usd || 0,
        compareAtPrice: foundLocal.compareAtPrice || foundLocal.compare_at_price_usd || null,
        stock: foundLocal.stock || 0,
        tagline: foundLocal.tagline || (foundLocal.description ? foundLocal.description.substring(0, 50) + '...' : '')
      };
      setActiveProduct(formattedLocal);
      return;
    }

    // 2. Si no se encuentra localmente, consultar Supabase
    async function fetchProductBySlugOrId() {
      try {
        let query = supabase.from('products').select('*, categories(name)').eq('is_active', true);
        
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug);
        const isNumeric = /^\d+$/.test(slug);

        if (isUUID || isNumeric) {
          query = query.or(`id.eq.${slug},slug.eq.${slug}`);
        } else {
          query = query.eq('slug', slug);
        }

        const { data, error } = await query;
        if (error) throw error;

        let foundProduct = data && data[0];

        // Fallback: Si no se encuentra por slug exacto, buscar en todos los productos activos con generateSlug
        if (!foundProduct) {
          const { data: allData, error: allErr } = await supabase
            .from('products')
            .select('*, categories(name)')
            .eq('is_active', true);
          
          if (!allErr && allData) {
            foundProduct = allData.find(
              (p) => p.slug === slug || generateSlug(p.name) === slug || String(p.id) === String(slug)
            );
          }
        }

        if (foundProduct) {
          const mappedProduct = {
            ...foundProduct,
            image: foundProduct.images_urls?.[0] || 'https://via.placeholder.com/150',
            price: foundProduct.price_usd || 0,
            salePrice: foundProduct.sale_price_usd || (foundProduct.compare_at_price_usd && foundProduct.compare_at_price_usd < foundProduct.price_usd ? foundProduct.compare_at_price_usd : null),
            tagline: foundProduct.description ? foundProduct.description.substring(0, 50) + '...' : '',
            stock: foundProduct.stock || 0,
            compareAtPrice: foundProduct.compare_at_price_usd || null,
            offerEndsAt: foundProduct.offer_ends_at || null,
            isBestSeller: foundProduct.is_best_seller || false,
            category: foundProduct.categories?.name || '—'
          };
          setActiveProduct(mappedProduct);
        }
      } catch (err) {
        console.error('Error fetching product by slug:', err);
      }
    }

    fetchProductBySlugOrId();
  }, [slug, products]);

  // ── Limpiar filtro de navegación ──────────────────────────────────────────
  const clearFilter = useCallback(() => {
    clearNavFilter();
    setNavFilterState(null);
    setSelectedCategory('Todos');
    setFilteredProducts(products); // ¡CLAVE! Restablece el catálogo completo original
    // También limpiar best_sellers si está activo
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('filter');
      return next;
    });
  }, [products, setSearchParams]);

  // ── Filtrado combinado en memoria ─────────────────────────────────────────
  useEffect(() => {
    // Cláusula de escape limpia al inicio: si no hay filtros activos, mostrar todo
    if (!navFilter && selectedCategory === 'Todos' && !isBestSellersFilter) {
      setFilteredProducts(products);
      return;
    }

    let result = [...products];

    // Filtro por más vendidos (query param URL) — máxima prioridad
    if (isBestSellersFilter) {
      setFilteredProducts(result.filter(p => p.is_best_seller === true));
      return;
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

    setFilteredProducts(result);
  }, [products, selectedCategory, navFilter, isBestSellersFilter]);

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

  const handleCloseModal = () => {
    navigate('/tienda');
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
                className="pill-filter-container w-full"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <div className="flex items-center justify-between w-full max-w-7xl mx-auto gap-4">
                  {/* Left scroll control */}
                  <button
                    type="button"
                    onClick={() => handleScroll('left')}
                    className={`slider-arrow-btn ${showLeftArrow ? 'visible-arrow' : 'hidden-arrow'}`}
                    aria-label="Scroll left"
                  >
                    <ChevronLeft size={18} strokeWidth={2.5} />
                  </button>

                  {/* Central White Bar */}
                  <div className="pill-filter-wrapper flex-1 relative">
                    {/* Left fade gradient */}
                    <div className={`slider-fade-left ${showLeftArrow ? 'visible-fade' : 'hidden-fade'}`} />

                    {/* Scrollable Container */}
                    <div
                      ref={scrollContainerRef}
                      className="flex items-center gap-3 overflow-x-auto scrollbar-none scroll-smooth w-full py-1.5 px-2"
                    >
                      <button
                        onClick={() => setSelectedCategory('Todos')}
                        className={`flex-shrink-0 px-4 py-2 text-sm rounded-full border transition-all duration-300 whitespace-nowrap cursor-pointer ${
                          selectedCategory === 'Todos'
                            ? 'bg-[#4f6ef7] border-[#4f6ef7] text-white font-semibold shadow-md shadow-[#4f6ef7]/20'
                            : 'bg-[#1e293b] border-gray-700 text-white hover:bg-[#2d3a4f] hover:border-gray-600'
                        }`}
                      >
                        Todos
                      </button>
                      {categories.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`flex-shrink-0 px-4 py-2 text-sm rounded-full border transition-all duration-300 whitespace-nowrap cursor-pointer ${
                            selectedCategory === cat.id
                              ? 'bg-[#4f6ef7] border-[#4f6ef7] text-white font-semibold shadow-md shadow-[#4f6ef7]/20'
                              : 'bg-[#1e293b] border-gray-700 text-white hover:bg-[#2d3a4f] hover:border-gray-600'
                          }`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>

                    {/* Right fade gradient */}
                    <div className={`slider-fade-right ${showRightArrow ? 'visible-fade' : 'hidden-fade'}`} />
                  </div>

                  {/* Right scroll control */}
                  <button
                    type="button"
                    onClick={() => handleScroll('right')}
                    className={`slider-arrow-btn ${showRightArrow ? 'visible-arrow' : 'hidden-arrow'}`}
                    aria-label="Scroll right"
                  >
                    <ChevronRight size={18} strokeWidth={2.5} />
                  </button>
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
              key={`${selectedCategory}-${navFilter ? navFilter.value : 'all'}-${isBestSellersFilter}`}
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

      {/* Product Detail Modal */}
      {activeProduct && (
        <ProductDetailModal
          product={activeProduct}
          isOpen={!!activeProduct}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}