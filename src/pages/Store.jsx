import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { productService } from '../services/productService';
import { categories } from '../data/products';
import './Store.css';

export default function Store() {
  const [allProducts, setAllProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const loadProducts = async () => {
      try {
        setIsLoading(true);
        const data = await productService.getProducts();
        
        if (isMounted) {
          setAllProducts(data);
          setFilteredProducts(data);
        }
      } catch (error) {
        console.error('Error cargando productos:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCategoryFilter = (category) => {
    setSelectedCategory(category);
    
    if (category === 'all') {
      setFilteredProducts(allProducts);
    } else {
      const filtered = allProducts.filter(product => 
        product.category.toLowerCase() === category.toLowerCase()
      );
      setFilteredProducts(filtered);
    }
  };

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

  // Get unique categories from products
  const productCategories = ['all', ...new Set(allProducts.map(product => product.category))];

  return (
    <div className="store-page">
      {/* Hero Section */}
      <section className="store-hero">
        <div className="container">
          <motion.div 
            className="store-hero-content"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <h1 className="store-hero-title">Tienda SRX Tech</h1>
            <p className="store-hero-subtitle">
              Descubre nuestra selección premium de equipos fotográficos y de video
            </p>
            <div className="store-hero-divider"></div>
          </motion.div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="store-categories-section">
        <div className="container">
          <motion.div 
            className="section-header"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="section-subtitle">EXPLORA POR CATEGORÍA</span>
            <h2 className="section-title">Nuestras categorías</h2>
            <div className="title-divider"></div>
          </motion.div>

          <div className="categories-grid">
            {categories.map((category, index) => (
              <motion.div 
                key={category.id}
                className="category-card"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                onClick={() => handleCategoryFilter(category.name)}
              >
                <div className="category-image-wrapper">
                  <img 
                    src={category.image} 
                    alt={category.name}
                    className="category-image"
                  />
                  <div className="category-overlay"></div>
                </div>
                <div className="category-content">
                  <h3 className="category-name">{category.name}</h3>
                  <p className="category-description">{category.description}</p>
                  <button className="category-link-btn">
                    {category.linkText}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="store-products-section">
        <div className="container">
          <div className="store-products-header">
            <motion.div 
              className="section-header"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="section-subtitle">NUESTROS PRODUCTOS</span>
              <h2 className="section-title">
                {selectedCategory === 'all' ? 'Todos los productos' : `Productos de ${selectedCategory}`}
              </h2>
              <div className="title-divider"></div>
            </motion.div>

            {/* Category Filter */}
            <motion.div 
              className="category-filter"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <div className="filter-label">Filtrar por:</div>
              <div className="filter-buttons">
                {productCategories.map(category => (
                  <button
                    key={category}
                    className={`filter-btn ${selectedCategory === category ? 'active' : ''}`}
                    onClick={() => handleCategoryFilter(category)}
                  >
                    {category === 'all' ? 'Todos' : category}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>

          {isLoading ? (
            // Shimmer Loading Skeleton Grid
            <div className="products-grid">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="product-card skeleton" style={{ height: '350px' }}>
                  <div style={{ height: '220px', width: '100%' }}></div>
                  <div style={{ padding: '15px' }}>
                    <div className="skeleton" style={{ height: '18px', width: '70%', marginBottom: '10px' }}></div>
                    <div className="skeleton" style={{ height: '14px', width: '40%', marginBottom: '15px' }}></div>
                    <div className="skeleton" style={{ height: '40px', width: '100%', borderRadius: 'var(--radius-full)' }}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {filteredProducts.length > 0 ? (
                <motion.div 
                  className="products-grid"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {filteredProducts.map((product) => (
                    <motion.div key={product.id} variants={itemVariants}>
                      <ProductCard product={product} />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div 
                  className="no-products-message"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="no-products-icon">📷</div>
                  <h3>No hay productos en esta categoría</h3>
                  <p>Prueba seleccionando otra categoría o vuelve a "Todos"</p>
                  <button 
                    className="btn-catalog"
                    onClick={() => handleCategoryFilter('all')}
                  >
                    Ver todos los productos
                  </button>
                </motion.div>
              )}
            </>
          )}

          {/* Back to Home Link */}
          <motion.div 
            className="back-to-home-wrapper"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Link to="/" className="back-to-home-link">
              ← Volver al inicio
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}