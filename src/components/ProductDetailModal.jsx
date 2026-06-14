import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { X, ShoppingCart, CheckCircle, Star, Shield, Truck, Heart, Share2, ChevronRight, Zap, Lock, Smartphone, Package } from 'lucide-react';
import './ProductDetailModal.css';

// ── Sub-componente: SpecTabs ────────────────────────────────────────────────
function SpecTabs({ compatibleDevices = [], useScenarios = [] }) {
  const hasDevices = Array.isArray(compatibleDevices) && compatibleDevices.length > 0;
  const hasProducts = Array.isArray(useScenarios) && useScenarios.length > 0;

  // Determinar pestañas visibles
  const tabs = useMemo(() => {
    const t = [];
    if (hasDevices) t.push({ id: 'devices', label: 'Para tu equipo', icon: Smartphone });
    if (hasProducts) t.push({ id: 'products', label: 'Por producto', icon: Package });
    return t;
  }, [hasDevices, hasProducts]);

  const [activeTab, setActiveTab] = useState(tabs[0]?.id || '');

  // Si no hay datos en ninguno, no renderizar nada
  if (tabs.length === 0) return null;

  const activeIndex = tabs.findIndex(t => t.id === activeTab);

  return (
    <motion.div
      className="spec-tabs-container"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55 }}
    >
      {/* Barra de pestañas */}
      <div className="spec-tabs-bar">
        {tabs.map((tab, index) => {
          const IconComp = tab.icon;
          return (
            <button
              key={tab.id}
              className={`spec-tab-btn ${activeTab === tab.id ? 'spec-tab-btn--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              <IconComp size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
        {/* Indicador animado */}
        <div
          className="spec-tab-indicator"
          style={{
            width: `${100 / tabs.length}%`,
            transform: `translateX(${activeIndex * 100}%)`,
          }}
        />
      </div>

      {/* Contenido de la pestaña activa */}
      <div className="spec-tabs-content">
        <AnimatePresence mode="wait">
          {activeTab === 'devices' && hasDevices && (
            <motion.ul
              key="devices"
              className="spec-list"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              {compatibleDevices.map((device, i) => (
                <li key={i} className="spec-list-item">
                  <span className="spec-dot" />
                  <span>{device}</span>
                </li>
              ))}
            </motion.ul>
          )}

          {activeTab === 'products' && hasProducts && (
            <motion.ul
              key="products"
              className="spec-list"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              {useScenarios.map((item, i) => (
                <li key={i} className="spec-list-item">
                  <span className="spec-dot" />
                  <span>{item}</span>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Componente Principal ────────────────────────────────────────────────────
export default function ProductDetailModal({ product, isOpen, onClose }) {
  const { addToCart } = useCart();
  const { user, openAuthModalWithAction } = useAuth();
  const { formatUSD, formatVES, isLoading } = useCurrency();
  const [quantity, setQuantity] = useState(1);
  const [isLiked, setIsLiked] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  if (!product) return null;

  const hasSale = product.salePrice && product.salePrice < product.price;
  const price = hasSale ? product.salePrice : product.price;

  const handleAddToCart = () => {
    setIsAdding(true);
    const productWithQuantity = { ...product, quantity };
    addToCart(productWithQuantity);
    
    setTimeout(() => {
      setIsAdding(false);
      onClose();
    }, 1000);
  };

  const handleBuyNow = () => {
    setIsAdding(true);
    const productWithQuantity = { ...product, quantity };
    addToCart(productWithQuantity);
    
    setTimeout(() => {
      setIsAdding(false);
      onClose();
      // Auto-open cart
      const cartEvent = new CustomEvent('open-cart');
      window.dispatchEvent(cartEvent);
    }, 1000);
  };



  const contentVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", damping: 25, stiffness: 300 } },
    exit: { y: -20, opacity: 0, transition: { duration: 0.2 } }
  };

  return (
    <AnimatePresence>
      {isOpen && product && (
        <motion.div
          className="product-detail-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="product-detail-container"
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button - Universal */}
            <button 
              className="product-detail-close close-detail-btn"
              onClick={onClose}
              aria-label="Cerrar modal"
            >
              &times;
            </button>

            <div className="product-detail-content">
              {/* Product Image */}
              <div className="product-image-section">
                <motion.div 
                  className="product-image-wrapper"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                >
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="product-detail-image"
                  />
                  
                  {/* Quick Actions */}
                  <div className="product-actions">
                    <motion.button 
                      className="action-btn"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setIsLiked(!isLiked)}
                      aria-label={isLiked ? "Quitar de favoritos" : "Añadir a favoritos"}
                    >
                      <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
                    </motion.button>
                    
                    <motion.button 
                      className="action-btn"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      aria-label="Compartir"
                    >
                      <Share2 size={20} />
                    </motion.button>
                  </div>
                </motion.div>

                {/* Product Badges */}
                <div className="product-badges">
                  {hasSale && (
                    <motion.div 
                      className="badge sale-badge"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring" }}
                    >
                      <span>OFERTA</span>
                    </motion.div>
                  )}
                  {product.rating && (
                    <motion.div 
                      className="badge rating-badge"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.1 }}
                    >
                      <Star size={14} fill="currentColor" />
                      <span>{product.rating}</span>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Product Info */}
              <div className="product-info-section">
                <motion.div 
                  className="product-header"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {product.category && (
                    <span className="product-category">{product.category}</span>
                  )}
                  <h2 className="product-title">{product.name}</h2>
                  {product.tagline && (
                    <p className="product-tagline">{product.tagline}</p>
                  )}
                </motion.div>

                {/* Pricing */}
                <motion.div 
                  className="product-pricing"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="price-container">
                    {hasSale ? (
                      <div className="modal-price-group">
                        <span className="original-price">{formatUSD(product.price)}</span>
                        <div className="current-price-group">
                          <span className="current-price">{formatUSD(product.salePrice)}</span>
                        </div>
                        {!isLoading && (
                          <span className="price-bs current-price-ves">
                            {formatVES(product.salePrice)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="modal-price-group">
                        <span className="current-price">{formatUSD(price)}</span>
                        {!isLoading && (
                          <span className="price-bs current-price-ves">
                            {formatVES(price)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Description */}
                <motion.div 
                  className="product-description"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <p>{product.description}</p>
                </motion.div>

                {/* Features */}
                {product.specs && product.specs.length > 0 && (
                  <motion.div 
                    className="product-features"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <h4>Características</h4>
                    <ul>
                      {product.specs.map((spec, index) => (
                        <li key={index}>
                          <CheckCircle size={16} />
                          <span>{spec}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}

                {/* ── Pestañas: Para tu equipo / Por producto ── */}
                <SpecTabs
                  compatibleDevices={product.compatible_devices}
                  useScenarios={product.use_scenarios}
                />

                {/* Quantity Selector */}
                <motion.div 
                  className="quantity-selector"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <label>Cantidad:</label>
                  <div className="quantity-controls">
                    <button 
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      aria-label="Disminuir cantidad"
                    >
                      -
                    </button>
                    <span className="quantity-display">{quantity}</span>
                    <button 
                      onClick={() => setQuantity(quantity + 1)}
                      aria-label="Aumentar cantidad"
                    >
                      +
                    </button>
                  </div>
                </motion.div>

                {/* Action Buttons */}
                <motion.div 
                  className="product-actions-container"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <motion.button 
                    className="btn-add-to-cart"
                    onClick={handleAddToCart}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isAdding}
                  >
                    {isAdding ? (
                      <span className="loading-spinner-small"></span>
                    ) : (
                      <>
                        <ShoppingCart size={20} />
                        <span>Añadir al Carrito</span>
                      </>
                    )}
                  </motion.button>

                  <motion.button 
                    className="btn-buy-now"
                    onClick={handleBuyNow}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isAdding}
                  >
                    {isAdding ? (
                      <span className="loading-spinner-small"></span>
                    ) : (
                      <>
                        <span>Comprar Ahora</span>
                        <ChevronRight size={18} />
                      </>
                    )}
                  </motion.button>
                </motion.div>

                {/* Trust Badges */}
                <motion.div 
                  className="trust-badges"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  <div className="trust-item">
                    <Shield size={20} />
                    <span>Garantía de 2 años</span>
                  </div>
                  <div className="trust-item">
                    <Truck size={20} />
                    <span>Envío gratis</span>
                  </div>
                  <div className="trust-item">
                    <Zap size={20} />
                    <span>Envío rápido</span>
                  </div>
                  <div className="trust-item">
                    <Lock size={20} />
                    <span>Pago seguro</span>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}