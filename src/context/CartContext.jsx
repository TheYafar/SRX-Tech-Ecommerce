import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNotifications } from './NotificationContext';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const { showSuccess } = useNotifications();
  const [cartItems, setCartItems] = useState(() => {
    const savedCart = localStorage.getItem('srx_cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('srx_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === product.id);
      if (existingItem) {
        return prevItems.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevItems, { ...product, quantity: 1 }];
    });
    // Auto-open cart when adding an item
    setIsCartOpen(true);
    
    showSuccess(`"${product.name || product.title}" añadido al carrito`, 2000);
  };

  const removeFromCart = (productId) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  const cartTotal = cartItems.reduce((total, item) => {
    const activePrice = item.salePrice || item.price;
    return total + activePrice * item.quantity;
  }, 0);

  const checkout = (paymentMethod, userEmail) => {
    const orderId = 'SRX-' + Math.floor(100000 + Math.random() * 900000);
    
    const newOrder = {
      id: orderId,
      userEmail: userEmail || 'invitado@srx.tech',
      date: new Date().toISOString(),
      items: [...cartItems],
      paymentMethod,
      total: cartTotal
    };

    // Save to order history
    const savedOrders = localStorage.getItem('srx_orders');
    const ordersList = savedOrders ? JSON.parse(savedOrders) : [];
    ordersList.push(newOrder);
    localStorage.setItem('srx_orders', JSON.stringify(ordersList));

    return orderId;
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        cartTotal,
        checkout
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
