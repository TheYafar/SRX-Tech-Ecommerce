import { useEffect } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import { useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { ProductProvider } from './context/ProductContext';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Store from './pages/Store';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';
import ResetPassword from './pages/ResetPassword';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminOrders from './pages/Admin/AdminOrders';
import AdminProducts from './pages/Admin/AdminProducts';
import AdminCoupons from './pages/Admin/AdminCoupons';
import AdminCategoriesOrder from './pages/Admin/AdminCategoriesOrder';
import AdminRoute from './components/AdminRoute';
import './App.css';

const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || "EK6JF6DAIwyrQdsyYH_bj6b4_zsYkGrNboV5Tj5lDyQXsj74ygYevgAcwjUqFOHpE4fK3bJOIKdoW6i2";

function FacebookPixelTracker() {
  const location = useLocation();

  useEffect(() => {
    window.fbq = window.fbq || function() {
      (window.fbq.q = window.fbq.q || []).push(arguments);
    };
    window._fbq = window._fbq || window.fbq;
    window.fbq.push = window.fbq;
    window.fbq.loaded = true;
    window.fbq.version = '2.0';
    window.fbq.queue = [];

    const scriptId = 'facebook-pixel-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      document.head.appendChild(script);
    }

    window.fbq('init', '1341230694784299');
  }, []);

  useEffect(() => {
    window.fbq = window.fbq || function() {
      (window.fbq.q = window.fbq.q || []).push(arguments);
    };
    if (window.fbq) {
      window.fbq('track', 'PageView');
      console.log('[Meta Pixel] Evento disparado: PageView', { path: location.pathname });
    }
  }, [location.pathname]);

  return null;
}


function RegisterRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  const { openAuthModal } = useAuth();

  useEffect(() => {
    const email = location.state?.email || '';
    openAuthModal('register', email);
    navigate('/', { replace: true });
  }, [navigate, location, openAuthModal]);

  return null;
}

export default function App() {
  return (
    <PayPalScriptProvider options={{
      "client-id": paypalClientId,
      currency: "USD",
      components: "buttons",
      intent: "capture"
    }}>
      <NotificationProvider>
        <AuthProvider>
          <CurrencyProvider>
            <ProductProvider>
              <CartProvider>
                <WishlistProvider>
                  <HashRouter>
                    <FacebookPixelTracker />
                    <Routes>
                      <Route path="/" element={<MainLayout />}>
                        <Route index element={<Home />} />
                        <Route path="tienda" element={<Store />} />
                        <Route path="tienda/:slug" element={<Store />} />
                        <Route path="profile" element={<Profile />} />
                        <Route path="register" element={<RegisterRedirect />} />
                        <Route path="signup" element={<RegisterRedirect />} />
                        <Route path="reset-password" element={<ResetPassword />} />
                        <Route path="*" element={<NotFound />} />
                      </Route>
                      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
                        <Route index element={<AdminDashboard activeSection="addProduct" />} />
                        <Route path="orders" element={<AdminOrders />} />
                        <Route path="products" element={<AdminProducts />} />
                        <Route path="coupons" element={<AdminCoupons />} />
                        <Route path="pedidos-contado" element={<AdminDashboard activeSection="payments" />} />
                        <Route path="categories" element={<AdminDashboard activeSection="categories" />} />
                        <Route path="orden-categorias" element={<AdminCategoriesOrder />} />
                        <Route path="banners" element={<AdminDashboard activeSection="banners" />} />
                      </Route>
                    </Routes>
                  </HashRouter>
                </WishlistProvider>
              </CartProvider>
            </ProductProvider>
          </CurrencyProvider>
        </AuthProvider>
      </NotificationProvider>
    </PayPalScriptProvider>
  );
}
