import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNotifications } from './NotificationContext';

const WishlistContext = createContext();

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

export const WishlistProvider = ({ children }) => {
  const { showSuccess, showInfo } = useNotifications();
  const [wishlistItems, setWishlistItems] = useState(() => {
    const savedWishlist = localStorage.getItem('srx_wishlist');
    return savedWishlist ? JSON.parse(savedWishlist) : [];
  });

  useEffect(() => {
    localStorage.setItem('srx_wishlist', JSON.stringify(wishlistItems));
  }, [wishlistItems]);

  const isProductLiked = useCallback((productId) => {
    return wishlistItems.some((item) => item.id === productId);
  }, [wishlistItems]);

  const addToWishlist = useCallback((product) => {
    setWishlistItems((prev) => {
      if (prev.some((item) => item.id === product.id)) return prev;
      return [...prev, product];
    });
    showSuccess(`"${product.name || product.title}" añadido a tus favoritos`, 2000);
  }, [showSuccess]);

  const removeFromWishlist = useCallback((productId) => {
    setWishlistItems((prev) => {
      const product = prev.find((item) => item.id === productId);
      if (product) {
        showInfo(`"${product.name || product.title}" eliminado de tus favoritos`, 2000);
      }
      return prev.filter((item) => item.id !== productId);
    });
  }, [showInfo]);

  const toggleWishlist = useCallback((product) => {
    if (isProductLiked(product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  }, [isProductLiked, addToWishlist, removeFromWishlist]);

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        isProductLiked
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};
