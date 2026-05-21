import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { X, Plus, Minus, Trash2, ShoppingBag, CreditCard, Sparkles, CheckCircle2 } from 'lucide-react';
import CheckoutModal from './CheckoutModal';
import './CartDrawer.css';

export default function CartDrawer() {
  const { user } = useAuth();
  const { 
    cartItems, 
    isCartOpen, 
    setIsCartOpen, 
    updateQuantity, 
    removeFromCart, 
    cartTotal,
    clearCart
  } = useCart();

  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isCheckoutSuccess, setIsCheckoutSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');

  const handleOpenCheckout = () => {
    setIsCheckoutModalOpen(true);
  };

  const handleCloseCheckout = () => {
    setIsCheckoutModalOpen(false);
  };

  const handleCheckoutSuccess = (generatedId) => {
    setOrderId(generatedId);
    setIsCheckoutSuccess(true);
    setIsCheckoutModalOpen(false);
  };

  const handleCloseSuccess = () => {
    setIsCheckoutSuccess(false);
    clearCart();
    setIsCartOpen(false);
  };

  if (!isCartOpen) return null;

  return (
    <div className="cart-drawer-overlay animate-fade-in">
      <div className="cart-drawer-backdrop" onClick={() => setIsCartOpen(false)}></div>
      
      <div className="cart-drawer-container">
        {isCheckoutSuccess ? (
          <div className="checkout-success-view animate-fade-in-up">
            <div className="success-icon-wrapper">
              <CheckCircle2 size={48} className="success-icon" />
            </div>
            <h3 className="success-title">¡Pedido Registrado!</h3>
            <p className="success-subtitle">Hemos recibido tu orden de compra en SRX Tech.</p>
            
            <div className="order-details-box glass-card">
              <div className="order-row">
                <span className="order-label">ID del Pedido:</span>
                <span className="order-value">{orderId}</span>
              </div>
              <div className="order-row">
                <span className="order-label">Monto Total:</span>
                <span className="order-value total">${cartTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="success-instructions">
              <p>Te hemos enviado las instrucciones de pago a tu correo. Por favor, reporta tu capture una vez realizada la transferencia.</p>
            </div>

            <button className="success-btn" onClick={handleCloseSuccess}>
              Entendido
            </button>
          </div>
        ) : (
          <>
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
                            <span className="cart-item-price">${price.toFixed(2)}</span>
                            
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
                  <span className="summary-subtotal">${cartTotal.toFixed(2)}</span>
                </div>
                
                <button 
                  className="checkout-submit-btn"
                  onClick={handleOpenCheckout}
                >
                  <CreditCard size={18} />
                  <span>Proceder al Pago</span>
                </button>
              </div>
            )}
          </>
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
