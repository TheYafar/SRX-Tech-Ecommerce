import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User as UserIcon, 
  ShoppingBag, 
  Heart, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  Mail, 
  CreditCard,
  Package,
  ShoppingCart
} from 'lucide-react';
import ProductCard from '../components/ProductCard';
import './Profile.css';

export default function Profile() {
  const { user, logout, openAuthModal } = useAuth();
  const { wishlistItems, toggleWishlist } = useWishlist();
  const { cartCount, addToCart } = useCart();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'orders' | 'wishlist'
  const [orders, setOrders] = useState([]);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // Protected Route Check
  useEffect(() => {
    if (!user) {
      navigate('/');
      openAuthModal('login');
    }
  }, [user, navigate, openAuthModal]);

  // Load orders history from localStorage
  useEffect(() => {
    if (user) {
      const savedOrders = localStorage.getItem('srx_orders');
      if (savedOrders) {
        try {
          const parsed = JSON.parse(savedOrders);
          // Filter orders for current user email (in mock setup, we store all, but filter is better)
          const userOrders = parsed.filter(o => o.userEmail === user.email);
          // Sort by newest date
          userOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
          setOrders(userOrders);
        } catch (e) {
          console.error('Error cargando historial de pedidos:', e);
        }
      }
    }
  }, [user]);

  if (!user) return null; // Prevent rendering during redirect

  const toggleOrderExpand = (id) => {
    setExpandedOrderId(prev => prev === id ? null : id);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const formatDate = (dateStr) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateStr).toLocaleDateString('es-ES', options);
  };

  return (
    <div className="profile-page-container">
      <div className="container">
        <div className="profile-layout">
          
          {/* Sidebar */}
          <aside className="profile-sidebar glass-card">
            <div className="profile-summary">
              <div className="profile-avatar-large">
                <img src={user.avatar} alt={user.name} />
              </div>
              <h3 className="profile-summary-name">{user.name}</h3>
              <p className="profile-summary-email">{user.email}</p>
            </div>
            
            <nav className="profile-nav-menu">
              <button 
                className={`profile-nav-btn ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                <UserIcon size={18} />
                <span>Mi Perfil</span>
              </button>
              <button 
                className={`profile-nav-btn ${activeTab === 'orders' ? 'active' : ''}`}
                onClick={() => setActiveTab('orders')}
              >
                <ShoppingBag size={18} />
                <span>Mis Pedidos</span>
                {orders.length > 0 && (
                  <span className="cart-badge" style={{ position: 'relative', top: 0, right: -5 }}>
                    {orders.length}
                  </span>
                )}
              </button>
              <button 
                className={`profile-nav-btn ${activeTab === 'wishlist' ? 'active' : ''}`}
                onClick={() => setActiveTab('wishlist')}
              >
                <Heart size={18} />
                <span>Lista de Deseos</span>
                {wishlistItems.length > 0 && (
                  <span className="cart-badge" style={{ position: 'relative', top: 0, right: -5 }}>
                    {wishlistItems.length}
                  </span>
                )}
              </button>
              
              <button 
                className="profile-nav-btn logout-item"
                style={{ marginTop: '1rem', color: '#dc3545' }}
                onClick={handleLogout}
              >
                <span>Cerrar Sesión</span>
              </button>
            </nav>
          </aside>

          {/* Main Content Pane */}
          <section className="profile-content-area glass-card">
            <AnimatePresence mode="wait">
              
              {/* TAB 1: PROFILE DETAIL */}
              {activeTab === 'profile' && (
                <motion.div
                  key="profile-tab"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="tab-title-wrapper">
                    <h2 className="tab-title">Mi Perfil</h2>
                  </div>

                  <div className="profile-details-grid">
                    <div className="profile-detail-card">
                      <div className="detail-label">Nombre Completo</div>
                      <div className="detail-value">{user.name}</div>
                    </div>
                    <div className="profile-detail-card">
                      <div className="detail-label">Correo Electrónico</div>
                      <div className="detail-value">{user.email}</div>
                    </div>
                    <div className="profile-detail-card">
                      <div className="detail-label">Tipo de Cuenta</div>
                      <div className="detail-value">Miembro SRX VIP</div>
                    </div>
                    <div className="profile-detail-card">
                      <div className="detail-label">ID de Cuenta</div>
                      <div className="detail-value">USR-{user.id.slice(0, 8)}</div>
                    </div>
                  </div>

                  <div className="profile-stats-box">
                    <div className="stat-item glass-card">
                      <div className="stat-num">{wishlistItems.length}</div>
                      <div className="stat-label">Favoritos</div>
                    </div>
                    <div className="stat-item glass-card">
                      <div className="stat-num">{orders.length}</div>
                      <div className="stat-label">Pedidos Realizados</div>
                    </div>
                    <div className="stat-item glass-card">
                      <div className="stat-num">{cartCount}</div>
                      <div className="stat-label">Items en Carrito</div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 2: ORDERS HISTORY */}
              {activeTab === 'orders' && (
                <motion.div
                  key="orders-tab"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="tab-title-wrapper">
                    <h2 className="tab-title">Mis Pedidos</h2>
                  </div>

                  {orders.length === 0 ? (
                    <div className="wishlist-empty">
                      <div className="wishlist-empty-icon">
                        <ShoppingBag size={32} />
                      </div>
                      <h3 className="wishlist-empty-title">Aún no tienes pedidos</h3>
                      <p className="wishlist-empty-text">
                        Cuando realices compras en la tienda, aparecerá aquí todo el historial de transacciones.
                      </p>
                      <button className="wishlist-shop-btn" onClick={() => navigate('/')}>
                        Ir a Tienda
                      </button>
                    </div>
                  ) : (
                    <div className="orders-list">
                      {orders.map((order) => {
                        const isExpanded = expandedOrderId === order.id;
                        return (
                          <div className="order-card glass-card" key={order.id}>
                            <div 
                              className={`order-card-header ${isExpanded ? 'expanded' : ''}`}
                              onClick={() => toggleOrderExpand(order.id)}
                            >
                              <div className="order-header-info">
                                <div className="order-info-group">
                                  <span className="order-info-label">CÓDIGO DE ORDEN</span>
                                  <span className="order-info-value">{order.id}</span>
                                </div>
                                <div className="order-info-group">
                                  <span className="order-info-label">FECHA</span>
                                  <span className="order-info-value">{formatDate(order.date)}</span>
                                </div>
                                <div className="order-info-group">
                                  <span className="order-info-label">MÉTODO DE PAGO</span>
                                  <span className="order-info-value payment-tag" style={{ textTransform: 'uppercase' }}>
                                    {order.paymentMethod}
                                  </span>
                                </div>
                                <div className="order-info-group">
                                  <span className="order-info-label">TOTAL</span>
                                  <span className="order-info-value total" style={{ color: 'var(--nav-bg)' }}>
                                    ${order.total.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <span className="order-status-badge">Por Confirmar</span>
                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                              </div>
                            </div>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div 
                                  className="order-details-pane"
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <h4 style={{ fontWeight: 700, marginBottom: '0.8rem', color: 'var(--nav-bg)' }}>
                                    Detalle del Pedido
                                  </h4>
                                  
                                  <div className="order-items-grid">
                                    {order.items.map((item) => (
                                      <div className="order-item-row" key={item.id}>
                                        <div className="order-item-name-qty">
                                          <img src={item.image} alt={item.name} className="order-item-thumbnail" />
                                          <div className="order-item-text">
                                            <span className="order-item-title">{item.name}</span>
                                            <span className="order-item-qty">Cantidad: {item.quantity}</span>
                                          </div>
                                        </div>
                                        <span className="order-item-price">
                                          ${((item.salePrice || item.price) * item.quantity).toFixed(2)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>

                                  <div className="order-instruction-box">
                                    <p><strong>Instrucciones para completar tu pago:</strong></p>
                                    <p>Por favor, realiza la transferencia por el total de <strong>${order.total.toFixed(2)}</strong> vía <strong>{order.paymentMethod.toUpperCase()}</strong>.</p>
                                    <p>Una vez transferido, envía el comprobante indicando el ID del Pedido: <strong>{order.id}</strong> para procesar el envío de tus productos.</p>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 3: WISHLIST / FAVORITES */}
              {activeTab === 'wishlist' && (
                <motion.div
                  key="wishlist-tab"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="tab-title-wrapper">
                    <h2 className="tab-title">Lista de Deseos</h2>
                  </div>

                  {wishlistItems.length === 0 ? (
                    <div className="wishlist-empty">
                      <div className="wishlist-empty-icon">
                        <Heart size={32} />
                      </div>
                      <h3 className="wishlist-empty-title">Tu lista está vacía</h3>
                      <p className="wishlist-empty-text">
                        Añade productos de la tienda usando el icono de corazón para guardarlos y consultarlos después.
                      </p>
                      <button className="wishlist-shop-btn" onClick={() => navigate('/')}>
                        Explorar Tienda
                      </button>
                    </div>
                  ) : (
                    <div className="wishlist-grid">
                      {wishlistItems.map((product) => (
                        <div key={product.id} className="wishlist-item-wrapper" style={{ position: 'relative' }}>
                          <ProductCard product={product} />
                          <button 
                            className="quick-action-btn"
                            style={{ 
                              position: 'absolute', 
                              top: '12px', 
                              right: '12px', 
                              backgroundColor: '#fff', 
                              color: '#dc3545',
                              boxShadow: 'var(--shadow-sm)',
                              zIndex: 10
                            }}
                            onClick={() => toggleWishlist(product)}
                            aria-label="Quitar de favoritos"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

            </AnimatePresence>
          </section>

        </div>
      </div>
    </div>
  );
}
