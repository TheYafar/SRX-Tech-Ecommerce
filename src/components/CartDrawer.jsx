import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { X, Plus, Minus, Trash2, ShoppingBag, CreditCard, Lock } from 'lucide-react';
import CheckoutModal from './CheckoutModal';
import './CartDrawer.css';

export default function CartDrawer() {
  const { formatUSD, formatVES, isLoading } = useCurrency();
  const { 
    cartItems, 
    isCartOpen, 
    setIsCartOpen, 
    updateQuantity, 
    removeFromCart, 
    cartTotal
  } = useCart();
  const { user, openAuthModalWithAction } = useAuth();

  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  // Proceder al pago (se permite a invitados y usuarios registrados)
  const handleOpenCheckout = () => {
    console.log('✅ [CartDrawer:handleOpenCheckout] Abriendo checkout.');
    setIsCheckoutModalOpen(true);
  };

  const handleCloseCheckout = () => {
    setIsCheckoutModalOpen(false);
  };

  if (!isCartOpen) return null;

  return (
    <div className="cart-drawer-overlay animate-fade-in">
      <div className="cart-drawer-backdrop" onClick={() => setIsCartOpen(false)}></div>
      
      <div className="cart-drawer-container">
        {/* Header */}
        <div className="cart-drawer-header">
          <div className="cart-header-title">
            <ShoppingBag size={20} className="title-icon" />
            <h2>Tu Carrito</h2>
            <span className="items-count-indicator">{cartItems.length}</span>
          </div>
          <button 
            className="cart-close-btn" 
            onClick={() => setIsCartOpen(false)}
            aria-label="Cerrar carrito"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="cart-drawer-body">
          {cartItems.length === 0 ? (
            <div className="cart-empty-state">
              <div className="empty-icon-circle">
                <ShoppingBag size={32} />
              </div>
              <h3>Tu carrito está vacío</h3>
              <p>Agrega productos destacados de la tienda para comenzar tu experiencia.</p>
              <button className="empty-shop-btn" onClick={() => setIsCartOpen(false)}>
                Explorar Tienda
              </button>
            </div>
          ) : (
            <div className="cart-items-list">
              {cartItems.map((item) => {
                const price = item.salePrice || item.price;
                return (
                  <div className="cart-item glass-card" key={item.id}>
                    <div className="cart-item-img-wrapper">
                      <img src={item.image} alt={item.name} className="cart-item-img" />
                    </div>
                    <div className="cart-item-info">
                      <h4 className="cart-item-name">{item.name}</h4>
                      <span className="cart-item-category">{item.category}</span>
                      <div className="cart-item-price-quantity">
                        <div className="cart-item-price-group">
                          {!isLoading && <span className="cart-item-price-ves">{formatVES(price)}</span>}
                          <span className="cart-item-price">{formatUSD(price)}</span>
                        </div>
                        
                        <div className="quantity-controls">
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            aria-label="Disminuir cantidad"
                          >
                            <Minus size={12} />
                          </button>
                          <span>{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            aria-label="Aumentar cantidad"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <button 
                      className="cart-item-remove-btn" 
                      onClick={() => removeFromCart(item.id)}
                      aria-label="Eliminar producto"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Checkout Button */}
        {cartItems.length > 0 && (
          <div className="cart-drawer-footer">
            <div className="cart-summary-row">
              <span>Subtotal</span>
              <div className="summary-subtotal-group">
                <span className="summary-subtotal">{formatUSD(cartTotal)}</span>
                {!isLoading && <span className="summary-subtotal-ves">{formatVES(cartTotal)}</span>}
              </div>
            </div>
            
            <button 
              className="checkout-submit-btn"
              onClick={handleOpenCheckout}
              id="cart-proceder-pago-btn"
            >
              <CreditCard size={18} />
              <span>Proceder al Pago</span>
            </button>
          </div>
        )}
      </div>

      {/* Checkout Modal */}
      <CheckoutModal 
        isOpen={isCheckoutModalOpen} 
        onClose={handleCloseCheckout} 
      />
    </div>
  );
}
