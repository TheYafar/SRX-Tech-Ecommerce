/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/set-state-in-effect */
import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useNotifications } from './NotificationContext';
import { useAuth } from './AuthContext';
import { useProducts } from './ProductContext';
import { supabase } from '../utils/supabaseClient';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

// ============================================================
// Helper: Generates orders storage key for history persistence
// ============================================================
const getOrdersStorageKey = (user) => {
  return user ? `srx_orders_${user.id}` : 'srx_orders_guest';
};

// ============================================================
// CART PROVIDER — DUAL SESSION PERSISTENCE (GUEST VS AUTH)
// ============================================================
export const CartProvider = ({ children }) => {
  const { showSuccess } = useNotifications();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { products: availableProducts } = useProducts();

  const [cartItems, setCartItems] = useState([]);
  const [dbCartItems, setDbCartItems] = useState([]); // Raw cart items from Supabase (product_id & quantity)
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isFetchingDbCart, setIsFetchingDbCart] = useState(false);

  // Clean guest cart items from localStorage on mount (cleanup from older versions)
  useEffect(() => {
    try {
      localStorage.removeItem('srx_cart_guest');
    } catch (err) {
      console.error('Error cleaning guest cart storage:', err);
    }
  }, []);

  // Fetch cart items from database for authenticated users
  const fetchCartFromDb = useCallback(async (userId) => {
    if (!userId) return;
    setIsFetchingDbCart(true);
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select('product_id, quantity')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching cart items from Supabase:', error);
      } else if (data) {
        setDbCartItems(data);
      }
    } catch (err) {
      console.error('Unexpected error fetching database cart:', err);
    } finally {
      setIsFetchingDbCart(false);
    }
  }, []);

  // Handle auth session state changes
  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (user) {
      // Hydrate cart from Supabase for logged-in users
      fetchCartFromDb(user.id);
    } else {
      // Guest user or logged out -> Reset cart to empty (completely volatile)
      setDbCartItems([]);
      setCartItems([]);
    }
  }, [user, isAuthLoading, fetchCartFromDb]);

  // Combine database cart items with full product details once available
  useEffect(() => {
    if (!user) return; // Guests use direct local updates only

    if (dbCartItems.length === 0) {
      setCartItems([]);
      return;
    }

    const mapped = dbCartItems.map(dbItem => {
      const product = availableProducts.find(p => p.id === dbItem.product_id);
      if (product) {
        const stock = product.stock !== undefined && product.stock !== null ? product.stock : 0;
        let qty = dbItem.quantity;
        if (stock > 0 && qty > stock) {
          qty = stock;
        }
        if (qty < 1) {
          qty = 1;
        }
        return {
          ...product,
          quantity: qty
        };
      }
      return null;
    }).filter(Boolean);

    setCartItems(mapped);
  }, [dbCartItems, availableProducts, user]);

  // Handle immediate cleanup on custom logout event
  useEffect(() => {
    const handleLogout = () => {
      setCartItems([]);
      setDbCartItems([]);
    };
    window.addEventListener('srx-logout', handleLogout);
    return () => window.removeEventListener('srx-logout', handleLogout);
  }, []);

  // ==============================================================
  // CART ACTIONS
  // ==============================================================
  const addToCart = useCallback(async (product, qty = 1) => {
    const quantityToAdd = product.quantity || qty;

    // Get latest stock from availableProducts or fallback to product.stock
    const latestProduct = availableProducts.find(p => p.id === product.id) || product;
    const stock = latestProduct.stock !== undefined && latestProduct.stock !== null ? latestProduct.stock : 0;

    // 1. Snappy UI: update local state immediately
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === product.id);
      let newQty = quantityToAdd;
      if (existingItem) {
        newQty = existingItem.quantity + quantityToAdd;
      }

      if (stock > 0 && newQty > stock) {
        newQty = stock;
      }
      if (newQty < 1) {
        newQty = 1;
      }

      if (existingItem) {
        return prevItems.map((item) =>
          item.id === product.id ? { ...item, quantity: newQty } : item
        );
      }
      return [...prevItems, { ...product, quantity: newQty }];
    });

    setIsCartOpen(true);
    showSuccess(`"${product.name || product.title}" añadido al carrito`, 2000);

    // 2. Sync to Supabase if authenticated
    if (user) {
      // Optimistically update dbCartItems state
      setDbCartItems((prevDbItems) => {
        const existing = prevDbItems.find(item => item.product_id === product.id);
        let newQty = quantityToAdd;
        if (existing) {
          newQty = existing.quantity + quantityToAdd;
        }

        if (stock > 0 && newQty > stock) {
          newQty = stock;
        }
        if (newQty < 1) {
          newQty = 1;
        }

        if (existing) {
          return prevDbItems.map(item =>
            item.product_id === product.id ? { ...item, quantity: newQty } : item
          );
        }
        return [...prevDbItems, { product_id: product.id, quantity: newQty }];
      });

      try {
        const { data, error } = await supabase
          .from('cart_items')
          .select('quantity')
          .eq('user_id', user.id)
          .eq('product_id', product.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking cart item in DB:', error);
          return;
        }

        let dbQty = quantityToAdd;
        if (data) {
          dbQty = data.quantity + quantityToAdd;
        }

        if (stock > 0 && dbQty > stock) {
          dbQty = stock;
        }
        if (dbQty < 1) {
          dbQty = 1;
        }

        if (data) {
          const { error: updateError } = await supabase
            .from('cart_items')
            .update({ quantity: dbQty })
            .eq('user_id', user.id)
            .eq('product_id', product.id);
          if (updateError) console.error('Error updating cart quantity in DB:', updateError);
        } else {
          const { error: insertError } = await supabase
            .from('cart_items')
            .insert({
              user_id: user.id,
              product_id: product.id,
              quantity: dbQty
            });
          if (insertError) console.error('Error inserting cart item in DB:', insertError);
        }
      } catch (err) {
        console.error('Unexpected error during database sync inside addToCart:', err);
      }
    }
  }, [user, showSuccess, availableProducts]);

  const removeFromCart = useCallback(async (productId) => {
    // 1. Snappy UI: update local state immediately
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== productId));

    // 2. Sync to Supabase if authenticated
    if (user) {
      // Optimistically update dbCartItems
      setDbCartItems((prevDbItems) => prevDbItems.filter(item => item.product_id !== productId));

      try {
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId);
        if (error) console.error('Error deleting cart item from DB:', error);
      } catch (err) {
        console.error('Unexpected error deleting cart item from DB:', err);
      }
    }
  }, [user]);

  const updateQuantity = useCallback(async (productId, quantity) => {
    // Find the product to get its stock
    const product = availableProducts.find(p => p.id === productId);
    let stock = 0;
    if (product) {
      stock = product.stock !== undefined && product.stock !== null ? product.stock : 0;
    }

    let targetQuantity = quantity;
    if (stock > 0 && targetQuantity > stock) {
      targetQuantity = stock;
    }

    if (targetQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    // 1. Snappy UI: update local state immediately
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.id === productId ? { ...item, quantity: targetQuantity } : item
      )
    );

    // 2. Sync to Supabase if authenticated
    if (user) {
      // Optimistically update dbCartItems
      setDbCartItems((prevDbItems) =>
        prevDbItems.map(item =>
          item.product_id === productId ? { ...item, quantity: targetQuantity } : item
        )
      );

      try {
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: targetQuantity })
          .eq('user_id', user.id)
          .eq('product_id', productId);
        if (error) console.error('Error updating cart quantity in DB:', error);
      } catch (err) {
        console.error('Unexpected error updating cart quantity in DB:', err);
      }
    }
  }, [user, removeFromCart, availableProducts]);

  const clearCart = useCallback(async () => {
    // 1. Snappy UI: update local state immediately
    setCartItems([]);
    setDbCartItems([]);

    // 2. Sync to Supabase if authenticated
    if (user) {
      try {
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', user.id);
        if (error) console.error('Error clearing cart from DB:', error);
      } catch (err) {
        console.error('Unexpected error clearing cart from DB:', err);
      }
    }
  }, [user]);

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
        checkout,
        isFetchingDbCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

