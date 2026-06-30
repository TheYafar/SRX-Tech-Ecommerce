import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { useNotifications } from '../context/NotificationContext';
import { useProducts } from '../context/ProductContext';
import { supabase } from '../utils/supabaseClient';
import { X, ShoppingCart, CheckCircle, Star, Shield, Truck, Heart, Share2, ChevronRight, Zap, Lock, Smartphone, Package } from 'lucide-react';
import './ProductDetailModal.css';

// ── Sub-componente: SpecTabs ────────────────────────────────────────────────
function SpecTabs({ compatibleDevices = [], useScenarios = [] }) {
  const hasDevices = Array.isArray(compatibleDevices) && compatibleDevices.length > 0;
  const hasScenarios = Array.isArray(useScenarios) && useScenarios.length > 0;

  if (!hasDevices && !hasScenarios) return null;

  return (
    <motion.div
      className="product-compatibility-specs"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55 }}
    >
      {hasDevices && (
        <div className="compatibility-group">
          <span className="compatibility-title">
            <Smartphone size={16} />
            <span>Para tu equipo</span>
          </span>
          <div className="compatibility-badges">
            {compatibleDevices.map((device, i) => (
              <span key={i} className="compatibility-badge">
                {device}
              </span>
            ))}
          </div>
        </div>
      )}

      {hasScenarios && (
        <div className="compatibility-group">
          <span className="compatibility-title">
            <Package size={16} />
            <span>Ideal para</span>
          </span>
          <div className="compatibility-badges">
            {useScenarios.map((scenario, i) => (
              <span key={i} className="compatibility-badge scenario-badge">
                {scenario}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ── Componente Principal ────────────────────────────────────────────────────
export default function ProductDetailModal({ product, isOpen, onClose, onMouseEnter, onMouseLeave }) {
  const { addToCart, setIsCartOpen } = useCart();
  const { user, openAuthModalWithAction } = useAuth();
  const { formatUSD, formatVES, isLoading } = useCurrency();
  const { showSuccess, showError } = useNotifications();
  const { setSelectedProductId } = useProducts();
  const [quantity, setQuantity] = useState(1);
  const [isLiked, setIsLiked] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  
  const [complementProducts, setComplementProducts] = useState([]);
  const [complementsToProducts, setComplementsToProducts] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  useEffect(() => {
    if (!isOpen || !product?.id) {
      setComplementProducts([]);
      setComplementsToProducts([]);
      return;
    }

    const fetchRecommendationAndParents = async () => {
      setLoadingRecommendations(true);
      try {
        // 1. Fetch complementary products (what the current product recommends)
        const { data: recData, error: recError } = await supabase
          .from('product_recommendations')
          .select(`
            recommended_product_id,
            recommended_product:products!product_recommendations_recommended_product_id_fkey (
              id,
              name,
              price_usd,
              compare_at_price_usd,
              images_urls,
              stock
            )
          `)
          .eq('product_id', product.id);

        if (recError) throw recError;
        
        if (recData && recData.length > 0) {
          const recs = recData
            .map(item => item.recommended_product)
            .filter(Boolean)
            .map(p => ({
              ...p,
              image: p.images_urls?.[0] || 'https://via.placeholder.com/150',
              price: p.price_usd || 0,
              stock: p.stock || 0
            }));
          setComplementProducts(recs);
        } else {
          setComplementProducts([]);
        }

        // 2. Fetch parent products (what products/equipments the current product complements)
        const { data: parentData, error: parentError } = await supabase
          .from('product_recommendations')
          .select(`
            product_id,
            parent_product:products!product_recommendations_product_id_fkey (
              id,
              name,
              price_usd,
              compare_at_price_usd,
              images_urls,
              stock
            )
          `)
          .eq('recommended_product_id', product.id);

        if (parentError) throw parentError;

        if (parentData && parentData.length > 0) {
          const parents = parentData
            .map(item => item.parent_product)
            .filter(Boolean)
            .map(p => ({
              ...p,
              image: p.images_urls?.[0] || 'https://via.placeholder.com/150',
              price: p.price_usd || 0,
              stock: p.stock || 0
            }));
          setComplementsToProducts(parents);
        } else {
          setComplementsToProducts([]);
        }

      } catch (err) {
        console.warn('[ProductDetailModal] Error cargando complementos:', err);
        setComplementProducts([]);
        setComplementsToProducts([]);
      } finally {
        setLoadingRecommendations(false);
      }
    };

    fetchRecommendationAndParents();
  }, [product?.id, isOpen]);

  const handleAddRecommendationToCart = (rec) => {
    const formattedRec = {
      ...rec,
      image: rec.image || rec.images_urls?.[0] || 'https://via.placeholder.com/150',
      price: rec.price || rec.price_usd || 0,
      quantity: 1
    };
    addToCart(formattedRec);
    showSuccess(`¡${rec.name} añadido al carrito!`);
  };

  const images = useMemo(() => {
    if (!product) return [];
    if (Array.isArray(product.images_urls) && product.images_urls.length > 0) {
      return product.images_urls.filter(Boolean);
    }
    return product.image ? [product.image] : [];
  }, [product]);

  const sliderRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Sync activeIndex and scroll to start when product changes
  useEffect(() => {
    setActiveIndex(0);
    if (sliderRef.current) {
      sliderRef.current.scrollLeft = 0;
    }
  }, [product]);

  const handleSliderScroll = () => {
    if (!sliderRef.current) return;
    const { scrollLeft, clientWidth } = sliderRef.current;
    if (clientWidth > 0) {
      const index = Math.round(scrollLeft / clientWidth);
      if (index !== activeIndex && index >= 0 && index < images.length) {
        setActiveIndex(index);
      }
    }
  };

  const scrollToImage = (index) => {
    if (!sliderRef.current) return;
    const { clientWidth } = sliderRef.current;
    sliderRef.current.scrollTo({
      left: index * clientWidth,
      behavior: 'smooth'
    });
    setActiveIndex(index);
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/?product=${product.id}`;
    const shareData = {
      title: product.name,
      text: product.tagline || product.description || `Mira este increíble producto: ${product.name}`,
      url: shareUrl
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        showSuccess('¡Enlace del producto copiado al portapapeles!');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error sharing product:', err);
        try {
          await navigator.clipboard.writeText(shareUrl);
          showSuccess('¡Enlace del producto copiado al portapapeles!');
        } catch (clipErr) {
          showError('No se pudo copiar el enlace al portapapeles.');
        }
      }
    }
  };

  if (!product) return null;

  const isOutOfStock = product.stock === null || product.stock === undefined || product.stock <= 0;

  const priceUSD = Number(product.price_usd || product.price || 0);
  const compareAtPriceUSD = Number(product.compare_at_price_usd || product.compareAtPrice || 0);
  
  // Standard logic: compare_at_price_usd is original reference, price_usd is current active/offer price.
  // We check compare_at_price_usd > price_usd as specified. To be robust with the current DB values where
  // they might be swapped (compare_at_price_usd < price_usd), we check if they are different and non-zero.
  const hasOffer = compareAtPriceUSD > 0 && compareAtPriceUSD !== priceUSD;
  const originalPrice = hasOffer ? Math.max(compareAtPriceUSD, priceUSD) : priceUSD;
  const finalPrice = hasOffer ? Math.min(compareAtPriceUSD, priceUSD) : priceUSD;

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
      setIsCartOpen(true);
    }, 1000);
  };

  const handleHacerEncargo = () => {
    setIsAdding(true);
    const productWithQuantity = { ...product, quantity };
    addToCart(productWithQuantity);
    
    setTimeout(() => {
      setIsAdding(false);
      onClose();
      // Auto-open cart for pre-orders
      setIsCartOpen(true);
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
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
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
              {/* Product Image Slider */}
              <div className="product-image-section">
                <div className="product-image-slider-container">
                  <motion.div 
                    ref={sliderRef}
                    className="product-images-slider"
                    onScroll={handleSliderScroll}
                    whileHover={{ scale: 1.01 }}
                    transition={{ duration: 0.3 }}
                  >
                    {images.map((imgUrl, idx) => (
                      <div key={idx} className="product-slider-slide">
                        <img 
                          src={imgUrl} 
                          alt={`${product.name} - Imagen ${idx + 1}`} 
                          className="product-detail-image"
                          onClick={() => setIsLightboxOpen(true)}
                          style={{ cursor: 'zoom-in' }}
                        />
                      </div>
                    ))}
                  </motion.div>
                  
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
                      onClick={handleShare}
                      aria-label="Compartir"
                    >
                      <Share2 size={20} />
                    </motion.button>
                  </div>

                  {/* Navigation dots for mobile/slider */}
                  {images.length > 1 && (
                    <div className="slider-dots">
                      {images.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={`slider-dot ${activeIndex === idx ? 'active' : ''}`}
                          onClick={() => scrollToImage(idx)}
                          aria-label={`Ir a imagen ${idx + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Thumbnails Gallery */}
                {images.length > 1 && (
                  <div className="product-thumbnails-gallery">
                    {images.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`thumbnail-btn ${activeIndex === idx ? 'active' : ''}`}
                        onClick={() => scrollToImage(idx)}
                        aria-label={`Ver imagen ${idx + 1}`}
                      >
                        <img 
                          src={imgUrl} 
                          alt={`Miniatura ${idx + 1}`} 
                          className="thumbnail-img"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {/* Product Badges */}
                <div className="product-badges">
                  {hasOffer && (
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
                  style={{ marginBottom: '1.25rem' }}
                >
                  <div className="price-container">
                    {hasOffer ? (
                      <div className="modal-price-group">
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <span className="text-indigo-600 font-bold text-2xl" style={{ color: '#4f46e5', fontWeight: '700', fontSize: '1.5rem' }}>
                            {formatUSD(finalPrice)}
                          </span>
                          <span className="text-slate-400 line-through text-sm" style={{ color: '#94a3b8', textDecoration: 'line-through', fontSize: '0.875rem' }}>
                            {formatUSD(originalPrice)}
                          </span>
                        </div>
                        {!isLoading && (
                          <span className="price-bs current-price-ves" style={{ color: '#0f172a', fontWeight: '600', fontSize: '1.05rem', marginTop: '0.25rem', display: 'block' }}>
                            {formatVES(finalPrice)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="modal-price-group">
                        <span className="current-price">{formatUSD(finalPrice)}</span>
                        {!isLoading && (
                          <span className="price-bs current-price-ves" style={{ color: '#0f172a', fontWeight: '600', fontSize: '1.05rem', marginTop: '0.25rem', display: 'block' }}>
                            {formatVES(finalPrice)}
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
                  {isOutOfStock ? (
                    <motion.button 
                      className="btn-add-to-cart btn-hacer-encargo"
                      onClick={handleHacerEncargo}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={isAdding}
                      style={{ width: '100%', gridColumn: 'span 2' }}
                    >
                      {isAdding ? (
                        <span className="loading-spinner-small"></span>
                      ) : (
                        <>
                          <ShoppingCart size={20} />
                          <span>Hacer Encargo</span>
                        </>
                      )}
                    </motion.button>
                  ) : (
                    <>
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
                            <span>Comprar al contado</span>
                            <ChevronRight size={18} />
                          </>
                        )}
                      </motion.button>
                    </>
                  )}
                </motion.div>

                {/* Complementary Product Section */}
                {complementProducts && complementProducts.length > 0 && (
                  <motion.div 
                    className="product-complement-section mt-6 border-t border-slate-800 pt-4"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.75 }}
                  >
                    <h4 className="complement-title text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                      Se complementa perfectamente con:
                    </h4>
                    <div className="flex flex-col gap-2">
                      {complementProducts.map((compProd) => (
                        <div key={compProd.id} className="complement-card flex items-center justify-between p-3 rounded-xl bg-[#1e293b] border border-slate-800 gap-3">
                          <div 
                            className="complement-card-clickable flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                            onClick={() => setSelectedProductId(compProd.id)}
                            title={`Ver ${compProd.name}`}
                          >
                            <img 
                              src={compProd.image} 
                              alt={compProd.name} 
                              className="complement-card-img w-12 h-12 object-cover rounded-lg bg-slate-900 flex-shrink-0"
                            />
                            <div className="complement-card-info flex flex-col min-w-0 gap-0.5">
                              <span className="complement-card-name text-sm font-medium text-white truncate block">
                                {compProd.name}
                              </span>
                              <span className="complement-card-price text-sm font-bold text-indigo-400">
                                {formatUSD(compProd.price)}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAddRecommendationToCart(compProd)}
                            className="btn-add-complement-cart flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-all duration-200"
                          >
                            <ShoppingCart size={14} />
                            <span>Añadir al Carrito</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Parent Products Section (Equipos que complementa) */}
                {complementsToProducts && complementsToProducts.length > 0 && (
                  <motion.div 
                    className="product-complement-section mt-6 border-t border-slate-800 pt-4"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.78 }}
                  >
                    <h4 className="complement-title text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">
                      Es complemento para:
                    </h4>
                    <div className="flex flex-col gap-2">
                      {complementsToProducts.map((parentProd) => (
                        <div key={parentProd.id} className="complement-card flex items-center justify-between p-3 rounded-xl bg-[#1e293b] border border-slate-800 gap-3">
                          <div 
                            className="complement-card-clickable flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                            onClick={() => setSelectedProductId(parentProd.id)}
                            title={`Ver ${parentProd.name}`}
                          >
                            <img 
                              src={parentProd.image} 
                              alt={parentProd.name} 
                              className="complement-card-img w-12 h-12 object-cover rounded-lg bg-slate-900 flex-shrink-0"
                            />
                            <div className="complement-card-info flex flex-col min-w-0 gap-0.5">
                              <span className="complement-card-name text-sm font-medium text-white truncate block">
                                {parentProd.name}
                              </span>
                              <span className="complement-card-price text-sm font-bold text-indigo-400">
                                {formatUSD(parentProd.price)}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAddRecommendationToCart(parentProd)}
                            className="btn-add-complement-cart flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-all duration-200"
                          >
                            <ShoppingCart size={14} />
                            <span>Añadir al Carrito</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

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

      {/* Lightbox Visualizer for Fullscreen Image */}
      {isOpen && isLightboxOpen && (
        <motion.div
          className="product-lightbox-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsLightboxOpen(false)}
        >
          <button 
            className="lightbox-close-btn"
            onClick={() => setIsLightboxOpen(false)}
            aria-label="Cerrar pantalla completa"
          >
            &times;
          </button>
          
          <motion.div 
            className="lightbox-content"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 250 }}
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={images[activeIndex] || product.image} 
              alt={product.name} 
              className="lightbox-image"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}