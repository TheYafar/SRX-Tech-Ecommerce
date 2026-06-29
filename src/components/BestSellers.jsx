import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProductCard from './ProductCard';
import { useProducts } from '../context/ProductContext';
import './BestSellers.css';

export default function BestSellers() {
  const { products: allProducts, isLoading } = useProducts();

  // Filtrar por is_best_seller (mapeado como isBestSeller en ProductContext)
  const bestSellers = allProducts ? allProducts.filter(p => p.isBestSeller) : [];
  // Si no hay ninguno marcado, mostramos los 4 primeros como fallback
  const products = bestSellers.length > 0 ? bestSellers.slice(0, 4) : (allProducts ? allProducts.slice(0, 4) : []);

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
            <Link to="/tienda?filter=best_sellers" className="btn-view-all">
              Ver colección completa <ArrowRight size={18} />
            </Link>
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
