import { useEffect } from 'react';
import { Outlet, useSearchParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CartDrawer from '../components/CartDrawer';
import AuthModal from '../components/AuthModal';
import BottomNav from '../components/BottomNav';
import { NotificationManager } from '../components/Notification';
import { useProducts } from '../context/ProductContext';
import { generateSlug } from '../utils/slugify';

export default function MainLayout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { products } = useProducts();

  // Sync and redirect old ?product=ID query parameter to new route /tienda/:slug
  useEffect(() => {
    let productId = searchParams.get('product');

    if (!productId) {
      const urlParams = new URLSearchParams(window.location.search);
      productId = urlParams.get('product');
    }

    if (productId && products && products.length > 0) {
      const foundProduct = products.find(p => String(p.id) === String(productId));
      if (foundProduct) {
        const slug = foundProduct.slug || generateSlug(foundProduct.name) || String(foundProduct.id);
        
        // Clean URL parameters by replacing state or navigate to clean route
        setSearchParams({}, { replace: true });
        
        // Clean up URL search query before hash if it exists
        if (window.location.search) {
          const cleanUrl = window.location.origin + window.location.pathname + `#/tienda/${slug}`;
          window.history.replaceState({}, document.title, cleanUrl);
        } else {
          navigate(`/tienda/${slug}`, { replace: true });
        }
      }
    }
  }, [products, searchParams, setSearchParams, navigate]);

  return (
    <div className="app-layout">
      {/* Global Header Navigation */}
      <Navbar />

      {/* Dynamic Page Views */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Global Footer */}
      <Footer />

      {/* Overlay Drawers & Modals */}
      <CartDrawer />
      <AuthModal />
      <BottomNav />

      {/* Global Notification Container */}
      <NotificationManager />
    </div>
  );
}
