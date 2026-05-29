import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Store, ShoppingCart, User } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import './BottomNav.css';

export default function BottomNav() {
  const { cartCount, setIsCartOpen } = useCart();
  const { user, openAuthModal } = useAuth();
  const location = useLocation();

  const handleUserClick = () => {
    if (user) {
      window.location.href = '#/profile'; 
    } else {
      openAuthModal('login');
    }
  };

  const navItems = [
    { id: 'home', icon: Home, label: 'Inicio', path: '/' },
    { id: 'store', icon: Store, label: 'Tienda', path: '/tienda' },
  ];

  return (
    <div className="bottom-nav-container">
      <nav className="bottom-nav">
        {navItems.map((item) => (
          <Link
            key={item.id}
            to={item.path}
            className={`bottom-nav-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            <item.icon size={22} className="nav-icon" />
            <span className="nav-label">{item.label}</span>
            {location.pathname === item.path && (
              <motion.div layoutId="nav-indicator" className="nav-indicator" />
            )}
          </Link>
        ))}

        {/* Carrito */}
        <button 
          className="bottom-nav-item cart-btn-mobile"
          onClick={() => setIsCartOpen(true)}
        >
          <div className="cart-icon-wrapper">
            <ShoppingCart size={22} className="nav-icon" />
            {cartCount > 0 && (
              <span className="cart-badge-mobile animate-scale-in">
                {cartCount}
              </span>
            )}
          </div>
          <span className="nav-label">Carrito</span>
        </button>

        {/* Usuario / Perfil */}
        <button 
          className={`bottom-nav-item ${location.pathname === '/profile' ? 'active' : ''}`}
          onClick={handleUserClick}
        >
          <User size={22} className="nav-icon" />
          <span className="nav-label">{user ? 'Perfil' : 'Ingresar'}</span>
          {location.pathname === '/profile' && (
            <motion.div layoutId="nav-indicator" className="nav-indicator" />
          )}
        </button>
      </nav>
    </div>
  );
}
