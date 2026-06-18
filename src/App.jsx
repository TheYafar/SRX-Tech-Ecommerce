import { useEffect } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
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
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminOrders from './pages/Admin/AdminOrders';
import AdminProducts from './pages/Admin/AdminProducts';
import AdminCoupons from './pages/Admin/AdminCoupons';
import AdminRoute from './components/AdminRoute';
import './App.css';

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
    <NotificationProvider>
      <AuthProvider>
        <CurrencyProvider>
          <ProductProvider>
            <CartProvider>
              <WishlistProvider>
                <HashRouter>
                  <Routes>
                    <Route path="/" element={<MainLayout />}>
                      <Route index element={<Home />} />
                      <Route path="tienda" element={<Store />} />
                      <Route path="profile" element={<Profile />} />
                      <Route path="register" element={<RegisterRedirect />} />
                      <Route path="signup" element={<RegisterRedirect />} />
                      <Route path="*" element={<NotFound />} />
                    </Route>
                    <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
                      <Route index element={<AdminDashboard activeSection="addProduct" />} />
                      <Route path="orders" element={<AdminOrders />} />
                      <Route path="products" element={<AdminProducts />} />
                      <Route path="coupons" element={<AdminCoupons />} />
                      <Route path="payments" element={<AdminDashboard activeSection="payments" />} />
                      <Route path="categories" element={<AdminDashboard activeSection="categories" />} />
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
  );
}
