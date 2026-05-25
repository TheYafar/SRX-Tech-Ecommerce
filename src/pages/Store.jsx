import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { supabase } from '../utils/supabaseClient';
import './Store.css';

export default function Store() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        // Traer productos directos sin join
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*');
        
        if (productsError) throw productsError;

        // Traer lista de categorías para los filtros
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*');

        if (categoriesError) throw categoriesError;

        setProducts(productsData || []);
        setCategories(categoriesData || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleCategoryFilter = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  // Filtrado en memoria
  const filteredProducts = selectedCategory === 'Todos'
    ? products
    : products.filter(p => p.category_id === selectedCategory);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 12
      }
    }
  };

  return (
    <div className="store-page">
      {/* Premium Hero Section */}
      <section className="store-hero">
        <motion.div 
          className="hero-orb orb-1"
          animate={{ x: [0, 30, 0], y: [0, -40, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="hero-orb orb-2"
          animate={{ x: [0, -40, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        
        <div className="container relative z-10">
          <motion.div 
            className="store-hero-content glass-hero-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <motion.span 
              className="hero-badge"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
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
              onClick={() => {
                document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' });
              }}
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
                {selectedCategory === 'Todos' ? 'Todos los productos' : 'Productos filtrados'}
              </h2>
            </motion.div>

            {/* Premium Pill Filter */}
            <motion.div 
              className="pill-filter-container"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <div className="pill-filter-scroll">
                <button
                  className={`pill-btn ${selectedCategory === 'Todos' ? 'active' : ''}`}
                  onClick={() => handleCategoryFilter('Todos')}
                >
                  Todos
                  {selectedCategory === 'Todos' && (
                    <motion.div 
                      layoutId="activePill" 
                      className="active-pill-bg"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    className={`pill-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                    onClick={() => handleCategoryFilter(cat.id)}
                  >
                    {cat.name}
                    {selectedCategory === cat.id && (
                      <motion.div 
                        layoutId="activePill" 
                        className="active-pill-bg"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>

          {isLoading ? (
            // Shimmer Loading Skeleton Grid
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
          ) : (
            <motion.div 
              className="products-premium-grid"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
            >
              {filteredProducts.length > 0 ? (
                filteredProducts.map((producto) => {
                  const mappedProduct = {
                    ...producto,
                    name: producto.name,
                    price: producto.price_usd,
                    image: producto.images_urls?.[0]
                  };
                  return (
                    <motion.div key={producto.id} variants={itemVariants}>
                      <ProductCard product={mappedProduct} />
                    </motion.div>
                  );
                })
              ) : (
                <motion.div 
                  className="no-products-message glass-card"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  style={{ gridColumn: '1 / -1' }}
                >
                  <div className="no-products-icon-wrapper">
                    <span className="no-products-icon">📷</span>
                  </div>
                  <h3>No hay productos en esta categoría</h3>
                  <p>Prueba seleccionando otra categoría o vuelve a explorar todo nuestro catálogo.</p>
                  <button 
                    className="btn-catalog-premium"
                    onClick={() => handleCategoryFilter('Todos')}
                  >
                    Ver todos los productos
                  </button>
                </motion.div>
              )}
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