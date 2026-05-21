import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Hero from '../components/Hero';
import CategoryGrid from '../components/CategoryGrid';
import ProductCard from '../components/ProductCard';
import { productService } from '../services/productService';

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const loadProducts = async () => {
      try {
        setIsLoading(true);
        const data = await productService.getProducts({ featured: true });
        
        if (isMounted) {
          // Exclude hero product from the featured grid to match requirements
          setFeaturedProducts(data.filter((p) => !p.isHero));
        }
      } catch (error) {
        console.error('Error cargando productos destacados:', error);
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

  // Animation variants for staggered list entry
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
    <>
      {/* Banner de Presentación */}
      <Hero />

      {/* Grid de Categorías Clave */}
      <CategoryGrid />

      {/* Tienda y Productos Destacados */}
      <section id="tienda" className="featured-section">
        <div className="container">
          <motion.div 
            className="section-header"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="section-subtitle">NUESTRA SELECCIÓN</span>
            <h2 className="section-title">Productos destacados</h2>
            <div className="title-divider"></div>
          </motion.div>

          {isLoading ? (
            // Shimmer Loading Skeleton Grid
            <div className="products-grid">
              {[1, 2, 3, 4].map((n) => (
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
            <motion.div 
              className="products-grid"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {featuredProducts.map((product) => (
                <motion.div key={product.id} variants={itemVariants}>
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </motion.div>
          )}

          <motion.div 
            className="catalog-action-wrapper"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <button 
              className="btn-catalog"
              onClick={() => alert('¡Próximamente! Estamos expandiendo nuestro catálogo de productos en SRX Tech.')}
            >
              Ver todos los productos
            </button>
          </motion.div>
        </div>
      </section>
    </>
  );
}
