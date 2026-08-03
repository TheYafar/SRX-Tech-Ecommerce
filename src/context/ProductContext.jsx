/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';

const ProductContext = createContext();

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};

export const ProductProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState(null);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedData = (data || []).map(p => {
        const priceUSD = Number(p.price_usd || 0);
        const compareUSD = Number(p.compare_at_price_usd || 0);
        const saleUSD = Number(p.sale_price_usd || 0);

        let effectiveSalePrice = null;
        if (saleUSD > 0 && saleUSD < priceUSD) {
          effectiveSalePrice = saleUSD;
        } else if (compareUSD > 0 && compareUSD < priceUSD) {
          effectiveSalePrice = compareUSD;
        } else if (compareUSD > 0 && priceUSD < compareUSD) {
          effectiveSalePrice = priceUSD;
        }

        return {
          ...p,
          image: p.images_urls?.[0] || 'https://via.placeholder.com/150',
          price: priceUSD,
          price_usd: priceUSD,
          salePrice: effectiveSalePrice,
          effectivePrice: effectiveSalePrice ?? priceUSD,
          tagline: p.description ? p.description.substring(0, 50) + '...' : '',
          stock: p.stock || 0,
          compareAtPrice: p.compare_at_price_usd || null,
          offerEndsAt: p.offer_ends_at || null,
          isBestSeller: p.is_best_seller || false,
          category: p.categories?.name || '—'
        };
      });

      setProducts(mappedData);
    } catch (error) {
      console.error('Error loading products from Supabase:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchProducts();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [fetchProducts]);

  const addProductToState = (newProduct) => {
    // Update local state directly with newly created product
    setProducts((prev) => [newProduct, ...prev]);
  };

  return (
    <ProductContext.Provider value={{ products, isLoading, fetchProducts, addProductToState, setProducts, selectedProductId, setSelectedProductId }}>
      {children}
    </ProductContext.Provider>
  );
};
