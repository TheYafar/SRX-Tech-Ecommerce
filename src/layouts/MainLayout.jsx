import { useEffect } from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CartDrawer from '../components/CartDrawer';
import AuthModal from '../components/AuthModal';
import BottomNav from '../components/BottomNav';
import { NotificationManager } from '../components/Notification';
import { useProducts } from '../context/ProductContext';
import ProductDetailModal from '../components/ProductDetailModal';

export default function MainLayout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { products, selectedProductId, setSelectedProductId } = useProducts();
  const selectedProduct = products?.find(p => p.id === selectedProductId);

  // Sync state with URL product parameter on mount or when product list changes
  useEffect(() => {
    let productId = searchParams.get('product');

    // Fallback: Parse from window.location.search directly in case parameter is before hash
    if (!productId) {
      const urlParams = new URLSearchParams(window.location.search);
      productId = urlParams.get('product');
    }

    if (productId && products && products.length > 0) {
      const foundProduct = products.find(p => String(p.id) === String(productId));
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
      
      {/* Global Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          isOpen={!!selectedProductId}
          onClose={handleCloseModal}
        />
      )}

      {/* Global Notification Container */}
      <NotificationManager />
    </div>
  );
}
