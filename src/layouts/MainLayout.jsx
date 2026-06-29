import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CartDrawer from '../components/CartDrawer';
import AuthModal from '../components/AuthModal';
import BottomNav from '../components/BottomNav';
import { NotificationManager } from '../components/Notification';
import { useProducts } from '../context/ProductContext';
import ProductDetailModal from '../components/ProductDetailModal';

export default function MainLayout() {
  const { products, selectedProductId, setSelectedProductId } = useProducts();
  const selectedProduct = products?.find(p => p.id === selectedProductId);

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
          onClose={() => setSelectedProductId(null)}
        />
      )}

      {/* Global Notification Container */}
      <NotificationManager />
    </div>
  );
}
