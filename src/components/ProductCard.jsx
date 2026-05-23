import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useCurrency } from '../context/CurrencyContext';
import { motion } from 'framer-motion';
import { ShoppingCart, Eye, Heart, Star } from 'lucide-react';
import ProductDetailModal from './ProductDetailModal';
import './ProductCard.css';

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const { toggleWishlist, isProductLiked } = useWishlist();
  const { formatUSD, formatVES, isLoading } = useCurrency();
  const hasSale = product.salePrice && product.salePrice < product.price;
  const [isHovered, setIsHovered] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  const isLiked = isProductLiked(product.id);

  const handleAddToCart = () => {
    addToCart(product);
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
    }, 1000);
  };

  const handleQuickView = () => {
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
  };

  return (
    <>
      <motion.div 
        className="product-card hover-lift"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ y: -8 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
      >
        <div className="card-image-container">
          {hasSale && (
            <motion.div 
              className="card-sale-circle"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <span>¡Oferta!</span>
            </motion.div>
          )}
          
          {product.rating && (
            <div className="card-rating">
              <Star size={14} fill="currentColor" />
              <span>{product.rating}</span>
            </div>
          )}

          <motion.img 
            src={product.image} 
            alt={product.name} 
            className="card-image"
            loading="lazy"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
          />

          {/* Quick Actions Overlay */}
          <motion.div 
            className="card-actions-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.button 
              className="quick-action-btn view-btn"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleQuickView}
              aria-label="Ver detalles"
            >
              <Eye size={18} />
            </motion.button>
            
            <motion.button 
              className="quick-action-btn like-btn"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => toggleWishlist(product)}
              aria-label={isLiked ? "Quitar de favoritos" : "Añadir a favoritos"}
            >
              <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
            </motion.button>
          </motion.div>
        </div>

        <div className="card-info">
          {product.category && (
            <div className="card-category-badge">
              {product.category}
            </div>
          )}
          <h3 className="card-title" title={product.name}>
            {product.name}
          </h3>
          
          {product.tagline && (
            <p className="card-tagline">{product.tagline}</p>
          )}
          
          <div className="card-pricing">
            {hasSale ? (
              <div className="pricing-wrapper">
                <div className="usd-prices">
                  <span className="original-price">{formatUSD(product.price)}</span>
                  <motion.span 
                    className="current-price sale-price"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    {formatUSD(product.salePrice)}
                  </motion.span>
                </div>
                {!isLoading && (
                  <div className="ves-price">
                    Ref: {formatVES(product.salePrice)}
                  </div>
                )}
              </div>
            ) : (
              <div className="pricing-wrapper">
                <span className="current-price">{formatUSD(product.price)}</span>
                {!isLoading && (
                  <div className="ves-price">
                    Ref: {formatVES(product.price)}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <motion.button 
            className={`pill-btn cart-btn ${isAdded ? 'added-to-cart' : ''}`}
            onClick={handleAddToCart}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            data-product-id={product.id}
          >
            <ShoppingCart size={18} />
            <span>Añadir al carrito</span>
            <motion.span 
              className="cart-added-indicator"
              animate={{ scale: isAdded ? 1 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              ✓
            </motion.span>
          </motion.button>
        </div>
      </motion.div>

      {/* Product Detail Modal */}
      <ProductDetailModal 
        product={product} 
        isOpen={isDetailOpen} 
        onClose={handleCloseDetail} 
      />
    </>
  );
}
