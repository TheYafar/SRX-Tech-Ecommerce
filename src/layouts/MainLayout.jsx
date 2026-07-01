import { useEffect } from 'react';
<<<<<<< HEAD
import { Outlet, useSearchParams, useNavigate } from 'react-router-dom';
=======
import { Outlet, useSearchParams } from 'react-router-dom';
>>>>>>> 9ee00f1a54de86a0312da8b07ce6b48267d252e8
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CartDrawer from '../components/CartDrawer';
import AuthModal from '../components/AuthModal';
import BottomNav from '../components/BottomNav';
import { NotificationManager } from '../components/Notification';
import { useProducts } from '../context/ProductContext';
<<<<<<< HEAD
import { generateSlug } from '../utils/slugify';

export default function MainLayout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { products } = useProducts();

  // Sync and redirect old ?product=ID query parameter to new route /tienda/:slug
  useEffect(() => {
    let productId = searchParams.get('product');

=======
import ProductDetailModal from '../components/ProductDetailModal';

export default function MainLayout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { products, selectedProductId, setSelectedProductId } = useProducts();
  const selectedProduct = products?.find(p => p.id === selectedProductId);

  // Sync state with URL product parameter on mount or when product list changes
  useEffect(() => {
    let productId = searchParams.get('product');

    // Fallback: Parse from window.location.search directly in case parameter is before hash
>>>>>>> 9ee00f1a54de86a0312da8b07ce6b48267d252e8
    if (!productId) {
      const urlParams = new URLSearchParams(window.location.search);
      productId = urlParams.get('product');
    }

    if (productId && products && products.length > 0) {
      const foundProduct = products.find(p => String(p.id) === String(productId));
<<<<<<< HEAD
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
=======
      if (foundProduct && selectedProductId !== foundProduct.id) {
        setSelectedProductId(foundProduct.id);
      }
    }
  }, [products, searchParams, selectedProductId, setSelectedProductId]);

  const handleCloseModal = () => {
    setSelectedProductId(null);
    
    // Clear product parameter from route search params
    setSearchParams({});

    // Clear product parameter from URL query string (before hash) without page reload
    if (window.location.search) {
      const cleanUrl = window.location.origin + window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  };
>>>>>>> 9ee00f1a54de86a0312da8b07ce6b48267d252e8

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
<<<<<<< HEAD
=======
      
      {/* Global Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          isOpen={!!selectedProductId}
          onClose={handleCloseModal}
        />
      )}
>>>>>>> 9ee00f1a54de86a0312da8b07ce6b48267d252e8

      {/* Global Notification Container */}
      <NotificationManager />
    </div>
  );
}
