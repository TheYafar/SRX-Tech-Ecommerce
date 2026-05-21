import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useScroll } from '../hooks/useScroll';
import { ShoppingCart, User, Menu, X, Search, LogOut, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './Navbar.css';

export default function Navbar() {
  const { cartCount, setIsCartOpen } = useCart();
  const { user, logout, openAuthModal } = useAuth();
  const isScrolled = useScroll(20);
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const searchRef = useRef(null);
  const userDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollToSection = (id) => {
    setIsMobileMenuOpen(false);
    if (location.pathname !== '/') {
      navigate(`/#${id}`);
    } else {
      const element = document.getElementById(id);
      if (element) {
        const offset = 80;
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = element.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      alert(`Buscando: ${searchQuery}`);
      setSearchQuery('');
      setIsSearchOpen(false);
    }
  };

  const handleUserAction = () => {
    if (user) {
      setIsUserDropdownOpen(!isUserDropdownOpen);
    } else {
      openAuthModal('login');
    }
  };

  return (
    <header className={`navbar-header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="container navbar-container">
        <Link to="/" className="nav-logo" onClick={() => { if (location.pathname === '/') window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          <span className="logo-srx">SRX</span>
          <span className="logo-divider">|</span>
          <span className="logo-tech">Tech</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="desktop-nav">
          <Link to="/" onClick={() => { if (location.pathname === '/') window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="nav-link">
            Inicio
          </Link>
          <button onClick={() => scrollToSection('tienda')} className="nav-link">
            Tienda
          </button>
          <button onClick={() => scrollToSection('categorias')} className="nav-link">
            Categorías
          </button>
        </nav>

        {/* Search Bar */}
        <div className="nav-search-container" ref={searchRef}>
          <AnimatePresence>
            {isSearchOpen && (
              <motion.form
                className="nav-search-form"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 300, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onSubmit={handleSearch}
              >
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  className="nav-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                <button type="submit" className="nav-search-submit">
                  <Search size={18} />
                </button>
              </motion.form>
            )}
          </AnimatePresence>
          
          {!isSearchOpen && (
            <button 
              className="nav-action-btn search-toggle"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Buscar productos"
            >
              <Search size={20} />
            </button>
          )}
        </div>

        {/* Actions (User, Cart & Menu) */}
        <div className="nav-actions">
          {/* User Dropdown */}
          <div className="user-dropdown-container" ref={userDropdownRef}>
            <button 
              className="nav-action-btn user-btn"
              onClick={handleUserAction}
              aria-label={user ? "Perfil de usuario" : "Iniciar sesión"}
            >
              {user ? (
                <div className="user-avatar">
                  <img src={user.avatar} alt={user.name} />
                </div>
              ) : (
                <User size={20} />
              )}
              {user && <ChevronDown size={16} className="dropdown-chevron" />}
            </button>

            <AnimatePresence>
              {isUserDropdownOpen && user && (
                <motion.div
                  className="user-dropdown-menu"
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="dropdown-header">
                    <div className="dropdown-user-info">
                      <div className="dropdown-avatar">
                        <img src={user.avatar} alt={user.name} />
                      </div>
                      <div>
                        <div className="dropdown-user-name">{user.name}</div>
                        <div className="dropdown-user-email">{user.email}</div>
                      </div>
                    </div>
                  </div>
                  <div className="dropdown-divider"></div>
                  <button 
                    className="dropdown-item" 
                    onClick={() => { navigate('/profile', { state: { tab: 'profile' } }); setIsUserDropdownOpen(false); }}
                  >
                    Mi Perfil
                  </button>
                  <button 
                    className="dropdown-item" 
                    onClick={() => { navigate('/profile', { state: { tab: 'orders' } }); setIsUserDropdownOpen(false); }}
                  >
                    Mis Pedidos
                  </button>
                  <button 
                    className="dropdown-item" 
                    onClick={() => { navigate('/profile', { state: { tab: 'wishlist' } }); setIsUserDropdownOpen(false); }}
                  >
                    Lista de Deseos
                  </button>
                  <div className="dropdown-divider"></div>
                  <button 
                    className="dropdown-item logout-item"
                    onClick={logout}
                  >
                    <LogOut size={16} />
                    <span>Cerrar Sesión</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Cart */}
          <button 
            className="nav-action-btn cart-btn" 
            onClick={() => setIsCartOpen(true)}
            aria-label="Ver carrito"
          >
            <ShoppingCart size={20} />
            {cartCount > 0 && <span className="cart-badge animate-fade-in">{cartCount}</span>}
          </button>

          {/* Mobile Menu Toggle */}
          <button 
            className="nav-action-btn mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Alternar menú"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="mobile-nav-menu animate-fade-in">
          <div className="mobile-search-container">
            <form onSubmit={handleSearch} className="mobile-search-form">
              <Search size={18} className="mobile-search-icon" />
              <input
                type="text"
                placeholder="Buscar productos..."
                className="mobile-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
          </div>
          
          <Link to="/" onClick={() => { if (location.pathname === '/') window.scrollTo({ top: 0, behavior: 'smooth' }); setIsMobileMenuOpen(false); }} className="mobile-nav-link">
            Inicio
          </Link>
          <button onClick={() => scrollToSection('tienda')} className="mobile-nav-link">
            Tienda
          </button>
          <button onClick={() => scrollToSection('categorias')} className="mobile-nav-link">
            Categorías
          </button>
          
          {user ? (
            <>
              <div className="mobile-user-info" onClick={() => { navigate('/profile', { state: { tab: 'profile' } }); setIsMobileMenuOpen(false); }} style={{ cursor: 'pointer' }}>
                <div className="mobile-user-avatar">
                  <img src={user.avatar} alt={user.name} />
                </div>
                <div>
                  <div className="mobile-user-name">{user.name}</div>
                  <div className="mobile-user-email">{user.email}</div>
                </div>
              </div>
              <button 
                className="mobile-nav-link" 
                onClick={() => { navigate('/profile', { state: { tab: 'profile' } }); setIsMobileMenuOpen(false); }}
              >
                Mi Panel de Usuario
              </button>
              <button className="mobile-nav-link" onClick={() => { logout(); setIsMobileMenuOpen(false); }}>
                Cerrar Sesión
              </button>
            </>
          ) : (
            <>
              <button 
                className="mobile-nav-link auth-link"
                onClick={() => { openAuthModal('login'); setIsMobileMenuOpen(false); }}
              >
                Iniciar Sesión
              </button>
              <button 
                className="mobile-nav-link auth-link register"
                onClick={() => { openAuthModal('register'); setIsMobileMenuOpen(false); }}
              >
                Registrarse
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
}
