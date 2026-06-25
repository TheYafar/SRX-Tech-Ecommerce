import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useCurrency } from '../context/CurrencyContext';
import { motion } from 'framer-motion';
import { ShoppingCart, Heart, Star } from 'lucide-react';
import ProductDetailModal from './ProductDetailModal';
import './ProductCard.css';

export default function ProductCard({ product }) {
  const { user, openAuthModalWithAction } = useAuth();
  const { addToCart } = useCart();
  const { toggleWishlist, isProductLiked } = useWishlist();
  const { formatUSD, formatVES, isLoading } = useCurrency();
  const precioActual = Number(product.price || 0);
  const precioOferta = Number(product.compareAtPrice || product.compare_at_price_usd || 0);
  const tieneOferta = precioOferta > 0 && precioOferta < precioActual;
  const isOutOfStock = !product.stock || product.stock < 1;
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
      >
        <div className="card-image-container">
          {tieneOferta && (
            <div className="premium-offer-banner">OFERTA</div>
          )}
          
          {product.rating && (
            <div className="card-rating">
              <Star size={14} fill="currentColor" />
              <span>{product.rating}</span>
            </div>
          )}

          {/* Heart button re-located to the top-right corner */}
          <motion.button 
            className="absolute top-3 right-3 z-10 bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-sm hover:scale-105 transition"
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              zIndex: 10,
              backgroundColor: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              padding: '8px',
              borderRadius: '50%',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              border: 'none',
              width: '36px',
              height: '36px',
              transition: 'transform 0.2s, background-color 0.2s'
            }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              if (!user) {
                // No active session — open the auth modal and queue the wishlist action
                openAuthModalWithAction(
                  () => toggleWishlist(product),
                  'Inicia sesión para guardar productos en tus favoritos',
                  'login'
                );
                return;
              }
              // Active session — execute wishlist logic normally
              toggleWishlist(product);
            }}
            aria-label={isLiked ? "Quitar de favoritos" : "Añadir a favoritos"}
          >
            <Heart size={18} fill={isLiked ? "#ef4444" : "none"} style={{ color: isLiked ? '#ef4444' : '#374151', transition: 'color 0.2s' }} />
          </motion.button>

          {/* Clickable Image area wrapper */}
          <button 
            onClick={handleQuickView}
            className="absolute inset-0 w-full h-full block focus:outline-none cursor-pointer z-0 border-none bg-transparent p-0"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              border: 'none',
              background: 'transparent',
              padding: 0,
              cursor: 'pointer',
              zIndex: 1
            }}
            aria-label={`Ver detalles de ${product.name}`}
          >
            <motion.img 
              src={product.image} 
              alt={product.name} 
              className="card-image cursor-pointer"
              loading="lazy"
              whileHover={{ scale: 1.05, opacity: 0.95 }}
              transition={{ duration: 0.3 }}
            />
          </button>
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
            {tieneOferta ? (
              <div className="pricing-wrapper">
                <div className="price-container">
                  <span className="old-price">{formatUSD(precioActual)}</span>
                  <motion.span 
                    className="new-price"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    {formatUSD(precioOferta)}
                  </motion.span>
                </div>
                {!isLoading && (
                  <div className="ves-price">
                    Ref: {formatVES(precioOferta)}
                  </div>
                )}
              </div>
            ) : (
              <div className="pricing-wrapper">
                <span className="current-price">{formatUSD(precioActual)}</span>
                {!isLoading && (
                  <div className="ves-price">
                    Ref: {formatVES(precioActual)}
                  </div>
                )}
              </div>
            )}
          </div>

          <motion.button 
            className={`pill-btn cart-btn ${isOutOfStock ? 'order-btn' : ''} ${isAdded ? 'added-to-cart' : ''}`}
            onClick={handleAddToCart}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            data-product-id={product.id}
          >
            <ShoppingCart size={18} />
            <span>{isOutOfStock ? 'Hacer Encargo' : 'Añadir al carrito'}</span>
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

