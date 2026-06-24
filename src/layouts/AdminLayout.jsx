import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, ShoppingBag, Package, LogOut, Menu, X, Ticket, DollarSign, Layers, Sparkles, Image as ImageIcon } from 'lucide-react';
import { NotificationManager } from '../components/Notification';
import './AdminLayout.css';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // No se necesita verificación aquí: AdminRoute ya confirma que user.role === 'admin'

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
    { id: 'orders', icon: ShoppingBag, label: 'Encargos', path: '/admin/orders' },
    { id: 'products', icon: Package, label: 'Catálogo', path: '/admin/products' },
    { id: 'coupons', icon: Ticket, label: 'Cupones', path: '/admin/coupons' },
    { id: 'payments', icon: DollarSign, label: 'Pagos normales al contado', path: '/admin/payments' },
    { id: 'categories', icon: Layers, label: 'Gestionar Categorías', path: '/admin/categories' },
    { id: 'banners', icon: ImageIcon, label: 'Gestión de Banners', path: '/admin/banners' },
  ];

  const getInitials = (name) => {
    if (!name) return 'AD';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  const hasCustomAvatar = user?.avatar && !user.avatar.includes('ui-avatars.com');

  return (
    <div className="admin-layout">
      {/* Mobile Header */}
      <div className="admin-mobile-header">
        <div className="admin-mobile-logo-container">
          <img 
            src="/Renovacion_logo_SRX_1a_2.png" 
            alt="SRX Logo" 
            className="admin-logo-img" 
          />
          <span className="admin-logo-divider">|</span>
          <span className="admin-logo-text">Tech</span>
          <span className="admin-logo-badge">Admin</span>
        </div>
        <button className="admin-menu-btn" onClick={() => setIsSidebarOpen(true)}>
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`admin-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Link to="/" className="admin-logo-link">
            <img 
              src="/Renovacion_logo_SRX_1a_2.png" 
              alt="SRX Logo" 
              className="admin-logo-img" 
            />
            <span className="admin-logo-divider">|</span>
            <span className="admin-logo-text">Tech</span>
            <span className="admin-logo-badge">Admin</span>
          </Link>
          <button className="close-sidebar-btn" onClick={() => setIsSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <div className="admin-user-info">
          <div className="admin-avatar">
            {hasCustomAvatar ? (
              <img
                src={user.avatar}
                alt={user.name || 'Administrador'}
              />
            ) : (
              <div className="admin-avatar-initials">
                {getInitials(user?.name || user?.email || 'Admin')}
              </div>
            )}
          </div>
          <div className="admin-details">
            <div className="admin-name">{user?.name || user?.email?.split('@')[0] || 'Administrador'}</div>
            <div className="admin-role">Super Admin</div>
          </div>
        </div>

        <nav className="admin-nav">
          {navItems.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              className={`admin-nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => setIsSidebarOpen(false)}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="admin-logout-btn" onClick={logout}>
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div className="admin-overlay" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* Main Content */}
      <main className="admin-main-content">
        <Outlet />
      </main>

      {/* Notification Toast Container */}
      <NotificationManager />
    </div>
  );
}
