/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useNotifications } from './NotificationContext';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

// ============================================================
// Helper: Generates local storage key for cart persistence
// ============================================================
const getCartStorageKey = (user) => {
  return user ? `srx_cart_${user.id}` : 'srx_cart_guest';
};

const getOrdersStorageKey = (user) => {
  return user ? `srx_orders_${user.id}` : 'srx_orders_guest';
};

// ============================================================
// Helper: Safe load from localStorage
// ============================================================
const loadCartFromStorage = (key) => {
  if (!key) return [];
  try {
    const savedCart = localStorage.getItem(key);
    return savedCart ? JSON.parse(savedCart) : [];
  } catch (err) {
    console.error(`Error reading localStorage key "${key}":`, err);
    return [];
  }
};

// ============================================================
// Helper: Clean guest cart artifacts
// ============================================================
const cleanGuestCartArtifacts = () => {
  try {
    localStorage.removeItem('srx_cart_guest');
    localStorage.removeItem('srx_orders_guest');
  } catch (err) {
    console.error('Error cleaning guest cart storage:', err);
  }
};

// ============================================================
// CART PROVIDER — CONDITIONAL PERSISTENCE
// ============================================================
export const CartProvider = ({ children }) => {
  const { showSuccess } = useNotifications();
  const { user, isLoading: isAuthLoading } = useAuth();

  const prevUserIdRef = useRef(undefined);
  const isInitialLoadRef = useRef(true);

  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Load cart on authentication status change
  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    const currentUserId = user?.id || null;
    const prevUserId = prevUserIdRef.current;

    if (!isInitialLoadRef.current && currentUserId === prevUserId) {
      return;
    }

    isInitialLoadRef.current = false;
    prevUserIdRef.current = currentUserId;

    if (!user) {
      // Guest user -> Load guest cart
      const storageKey = getCartStorageKey(user);
      const loadedCart = loadCartFromStorage(storageKey);
      setCartItems(loadedCart);
      return;
    }

    // Registered user -> Load personal cart
    const storageKey = getCartStorageKey(user);
    const loadedCart = loadCartFromStorage(storageKey);
    setCartItems(loadedCart);
  }, [user, isAuthLoading]);

  // Persist cart items to matching local storage key
  const hasHydratedRef = useRef(false);

  useEffect(() => {
    if (isAuthLoading) return;

    if (!hasHydratedRef.current) {
      hasHydratedRef.current = true;
      return;
    }

    const storageKey = getCartStorageKey(user);
    try {
      localStorage.setItem(storageKey, JSON.stringify(cartItems));
    } catch (err) {
      console.error(`Error saving to localStorage key "${storageKey}":`, err);
    }
  }, [cartItems, user, isAuthLoading]);

  useEffect(() => {
    hasHydratedRef.current = false;
  }, [user?.id]);

  // ==============================================================
  // CART ACTIONS
  // ==============================================================
  const addToCart = useCallback((product) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === product.id);
      if (existingItem) {
        return prevItems.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevItems, { ...product, quantity: 1 }];
    });
    
    setIsCartOpen(true);
    showSuccess(`"${product.name || product.title}" añadido al carrito`, 2000);
  }, [showSuccess]);

  const removeFromCart = useCallback((productId) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  const cartTotal = cartItems.reduce((total, item) => {
    const activePrice = item.salePrice || item.price;
    return total + activePrice * item.quantity;
  }, 0);

  const checkout = useCallback((paymentMethod, userEmail) => {
    const orderId = 'SRX-' + Math.floor(100000 + Math.random() * 900000);

    const newOrder = {
      id: orderId,
      userEmail: userEmail || user?.email || 'invitado@srx.tech',
      date: new Date().toISOString(),
      items: [...cartItems],
      paymentMethod,
      total: cartTotal
    };

    const ordersKey = getOrdersStorageKey(user);
    if (ordersKey) {
      try {
        const savedOrders = localStorage.getItem(ordersKey);
        const ordersList = savedOrders ? JSON.parse(savedOrders) : [];
        ordersList.push(newOrder);
        localStorage.setItem(ordersKey, JSON.stringify(ordersList));
      } catch (err) {
        console.error(`Error saving order history key "${ordersKey}":`, err);
      }
    }

    return orderId;
  }, [cartItems, cartTotal, user]);

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
