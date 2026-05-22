import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import ProductCard from './ProductCard';
import { productService } from '../services/productService';
import './BestSellers.css';

export default function BestSellers() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const loadProducts = async () => {
      try {
        setIsLoading(true);
        // Usamos featured como proxy de más vendidos para el prototipo
        const data = await productService.getProducts({ featured: true });
        
        if (isMounted) {
          // Tomar los 4 primeros que no sean el hero
          setProducts(data.filter((p) => !p.isHero).slice(0, 4));
        }
      } catch (error) {
        console.error('Error cargando los más vendidos:', error);
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  return (
    <section className="best-sellers-section">
      <div className="container">
        <div className="best-sellers-header">
          <motion.div 
            className="best-sellers-title-wrapper"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <span className="best-sellers-subtitle">TENDENCIAS</span>
            <h2 className="best-sellers-title">Los más vendidos</h2>
          </motion.div>
          <motion.div 
            className="best-sellers-action"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <button className="btn-view-all" onClick={() => document.getElementById('tienda')?.scrollIntoView({ behavior: 'smooth' })}>
              Ver colección completa <ArrowRight size={18} />
            </button>
          </motion.div>
        </div>

        {isLoading ? (
          <div className="best-sellers-grid">
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
            className="best-sellers-grid"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {products.map((product) => (
              <motion.div key={product.id} variants={itemVariants}>
                <ProductCard product={product} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}
