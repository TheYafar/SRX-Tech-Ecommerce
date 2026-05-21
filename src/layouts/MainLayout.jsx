import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CartDrawer from '../components/CartDrawer';
import AuthModal from '../components/AuthModal';
import { NotificationManager } from '../components/Notification';

export default function MainLayout() {
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

      {/* Global Notification Container */}
      <NotificationManager />
    </div>
  );
}
