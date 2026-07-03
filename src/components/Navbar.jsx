import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useScroll } from '../hooks/useScroll';
import { ShoppingCart, User, Menu, X, Search, LogOut, ChevronDown, Grid, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../utils/supabaseClient';
import MegaMenu, { DEVICE_OPTIONS } from './MegaMenu';
import './Navbar.css';
import './MegaMenu.css';

// ── Contexto global ligero para el filtro de navegación ──────────────────────
// Usamos sessionStorage para pasar el filtro entre Navbar → Store
export function setNavFilter(filter) {
  sessionStorage.setItem('srx_nav_filter', JSON.stringify(filter));
  window.dispatchEvent(new Event('srx_nav_filter_change'));
}

export function getNavFilter() {
  try {
    return JSON.parse(sessionStorage.getItem('srx_nav_filter') || 'null');
  } catch {
    return null;
  }
}

export function clearNavFilter() {
  sessionStorage.removeItem('srx_nav_filter');
}

// ─────────────────────────────────────────────────────────────────────────────

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
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [showMobileSearch, setShowMobileSearch] = useState(true);

  const searchRef = useRef(null);
  const userDropdownRef = useRef(null);
  const categoriesBtnRef = useRef(null);
  const lastScrollY = useRef(0);

  // ── Scroll listener to show/hide mobile search bar on scroll up/down ─────
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Always show if we are near the top
      if (currentScrollY < 10) {
        setShowMobileSearch(true);
        lastScrollY.current = currentScrollY;
        return;
      }

      const diff = currentScrollY - lastScrollY.current;
      // Skip small scroll updates to prevent stutter/jittering
      if (Math.abs(diff) < 5) return;

      if (diff > 0) {
        // Scrolling down -> hide mobile search
        setShowMobileSearch(false);
      } else {
        // Scrolling up -> show mobile search
        setShowMobileSearch(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ── Cargar categorías desde Supabase ──────────────────────────────────────
  useEffect(() => {
    supabase
      .from('categories')
      .select('id, name, slug, parent_id, order')
      .order('order', { ascending: true })
      .order('name', { ascending: true })
      .then(({ data }) => {
        console.log('[Navbar] Categorías RAW de Supabase:', data?.map(c => ({ name: c.name, order: c.order, parent_id: c.parent_id })));
        if (data) setCategories(data);
      });
  }, []);

  // ── Click fuera → cerrar dropdowns ───────────────────────────────────────
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

  // ── Cerrar mega menú al navegar ───────────────────────────────────────────
  useEffect(() => {
    setIsMegaMenuOpen(false);
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // ── Bloquear scroll del body cuando el menú móvil está abierto ─────────────
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

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
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      }
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setNavFilter({ type: 'search', value: searchQuery.trim() });
      navigate('/tienda');
      setSearchQuery('');
      setIsSearchOpen(false);
      setIsMobileMenuOpen(false);
    }
  };

  const handleUserAction = () => {
    if (user) {
      setIsUserDropdownOpen(!isUserDropdownOpen);
    } else {
      openAuthModal('login');
    }
  };

  // ── Aplicar filtro y navegar a /tienda ────────────────────────────────────
  const handleFilter = useCallback((filter) => {
    setNavFilter(filter);
    navigate('/tienda');
    setIsMobileMenuOpen(false);
    setIsMegaMenuOpen(false);
  }, [navigate]);

  return (
    <>
      <header className={`navbar-header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="container navbar-container">
        {/* Bloque Izquierdo: Solo el logo */}
        <div className="navbar-left">
          <Link to="/" className="nav-logo" onClick={() => { if (location.pathname === '/') window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            <img 
              src="/Renovacion_logo_SRX_1a_2.png" 
              alt="SRX Logo" 
              className="nav-logo-img" 
            />
            <span className="logo-divider">|</span>
            <span className="logo-tech">Tech</span>
          </Link>
        </div>

        {/* Bloque Central: Menú de navegación (Inicio, Tienda, Explorar) */}
        <nav className="navbar-center">
          <ul className="nav-menu">
            <li>
              <Link
                to="/"
                onClick={() => { if (location.pathname === '/') window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="nav-link"
              >
                Inicio
              </Link>
            </li>
            <li>
              <Link to="/tienda" className="nav-link">
                Tienda
              </Link>
            </li>

            {/* Categorías con Mega Menú */}
            <li className="mega-trigger-wrapper">
              <button
                ref={categoriesBtnRef}
                className={`nav-link mega-trigger-btn ${isMegaMenuOpen ? 'mega-open' : ''}`}
                onClick={() => setIsMegaMenuOpen((prev) => !prev)}
                onMouseEnter={() => setIsMegaMenuOpen(true)}
                aria-haspopup="true"
                aria-expanded={isMegaMenuOpen}
              >
                Explorar
                <ChevronDown
                  size={14}
                  className={`mega-chevron ${isMegaMenuOpen ? 'rotated' : ''}`}
                />
              </button>

              {/* Mega Menú Desktop */}
              <MegaMenu
                categories={categories}
                isOpen={isMegaMenuOpen}
                onClose={() => setIsMegaMenuOpen(false)}
                onFilter={handleFilter}
              />
            </li>

            {user?.role === 'admin' && (
              <li>
                <Link to="/admin" className="nav-link" style={{ color: '#00f2fe', fontWeight: 'bold' }}>
                  Panel de Control
                </Link>
              </li>
            )}
          </ul>
        </nav>

        {/* Bloque Derecho: Buscador, Usuario y Carrito */}
        <div className="navbar-right">
          {/* Buscador */}
          <div className="nav-search-container" ref={searchRef}>
            <AnimatePresence>
              {isSearchOpen && (
                <motion.form
                  className="nav-search-form"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 220, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
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
                    <Search size={20} />
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

          {/* Perfil de Usuario */}
          <div className="user-dropdown-container" ref={userDropdownRef}>
            <button
              className="nav-action-btn user-btn"
              onClick={handleUserAction}
              aria-label={user ? 'Perfil de usuario' : 'Iniciar sesión'}
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
                  <button className="dropdown-item" onClick={() => { navigate('/profile', { state: { tab: 'profile' } }); setIsUserDropdownOpen(false); }}>
                    Mi Perfil
                  </button>
                  <button className="dropdown-item" onClick={() => { navigate('/profile', { state: { tab: 'orders' } }); setIsUserDropdownOpen(false); }}>
                    Mis Pedidos
                  </button>
                  <button className="dropdown-item" onClick={() => { navigate('/profile', { state: { tab: 'wishlist' } }); setIsUserDropdownOpen(false); }}>
                    Lista de Deseos
                  </button>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item logout-item" onClick={logout}>
                    <LogOut size={16} />
                    <span>Cerrar Sesión</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Carrito de Compras */}
          <button className="nav-action-btn cart-btn" onClick={() => setIsCartOpen(true)} aria-label="Ver carrito">
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

      {/* ── Mobile Navigation Drawer ── */}
      {isMobileMenuOpen && (
        <div className="mobile-nav-menu animate-fade-in fixed top-0 left-0 h-screen overflow-y-auto w-full z-[1001]">
          <div className="pb-10 pt-20">
            {/* Links básicos */}
            <Link to="/" onClick={() => { if (location.pathname === '/') window.scrollTo({ top: 0, behavior: 'smooth' }); setIsMobileMenuOpen(false); }} className="mobile-nav-link">
              Inicio
            </Link>
            <Link to="/tienda" onClick={() => setIsMobileMenuOpen(false)} className="mobile-nav-link">
              Tienda
            </Link>
            <button onClick={() => scrollToSection('categorias')} className="mobile-nav-link">
              Categorías
            </button>
            {user?.role === 'admin' && (
              <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="mobile-nav-link" style={{ color: '#00f2fe', fontWeight: 'bold' }}>
                Panel de Control
              </Link>
            )}

            {/* ── DIMENSIÓN 1: Categorías Dinámicas agrupadas por clasificación ── */}
            {categories.length > 0 && (
              (() => {
                const classifications = categories.filter(c => c.parent_id === null);
                const activeClassifications = classifications.filter(clf => {
                  const children = categories.filter(c => c.parent_id === clf.id);
                  return children.length > 0 || clf.slug === 'por-producto';
                });
                
                return activeClassifications.map(clf => {
                  const children = categories.filter(c => c.parent_id === clf.id);
                  if (clf.slug === 'para-tu-equipo') return null; // Se renderiza aparte
                  
                  return (
                    <div key={clf.id} className="mobile-dim-section">
                      <div className="mobile-dim-label">
                        <Grid size={11} />
                        {clf.name}
                      </div>
                      <div className="mobile-tags-row flex overflow-x-auto scrollbar-none whitespace-nowrap pr-6">
                        {children.map((cat) => (
                          <button
                            key={cat.id}
                            className="mobile-dim-tag"
                            onClick={() => {
                              handleFilter({ type: 'category', value: cat.id });
                              setIsMobileMenuOpen(false);
                            }}
                          >
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()
            )}

            {/* ── DIMENSIÓN 2: Para tu equipo ── */}
            <div className="mobile-dim-section">
              <div className="mobile-dim-label">
                <Smartphone size={11} />
                Para tu equipo
              </div>
              <div className="mobile-tags-row flex overflow-x-auto scrollbar-none whitespace-nowrap pr-6">
                {DEVICE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className="mobile-dim-tag"
                    onClick={() => handleFilter({ type: 'device', value: opt.value })}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>



            {/* User Section */}
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
                <button className="mobile-nav-link" onClick={() => { navigate('/profile', { state: { tab: 'profile' } }); setIsMobileMenuOpen(false); }}>
                  Mi Panel de Usuario
                </button>
                <button className="mobile-nav-link" onClick={() => { logout(); setIsMobileMenuOpen(false); }}>
                  Cerrar Sesión
                </button>
              </>
            ) : (
              <>
                <button className="mobile-nav-link auth-link" onClick={() => { openAuthModal('login'); setIsMobileMenuOpen(false); }}>
                  Iniciar Sesión
                </button>
                <button className="mobile-nav-link auth-link register" onClick={() => { openAuthModal('register'); setIsMobileMenuOpen(false); }}>
                  Registrarse
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>

      {/* Mobile Search Bar in normal flow */}
      <div className={`mobile-search-bar-flow ${!showMobileSearch ? 'search-hidden' : ''}`}>
        <form onSubmit={handleSearch} className="floating-search-form">
          <input
            type="text"
            placeholder="Buscar productos, marcas y más..."
            className="floating-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="floating-search-submit">
            <Search size={18} />
          </button>
        </form>
      </div>
    </>
  );
}
