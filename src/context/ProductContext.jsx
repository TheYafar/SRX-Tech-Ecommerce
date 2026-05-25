import React, { createContext, useState, useEffect, useContext } from 'react';
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

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      console.log('🔍 [ProductContext] Consultando productos en Supabase...');
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      const mappedData = (data || []).map(p => ({
        ...p,
        image: p.images_urls?.[0] || 'https://via.placeholder.com/150',
        price: p.price_usd || 0,
        salePrice: p.sale_price_usd || null,
        tagline: p.description ? p.description.substring(0, 50) + '...' : ''
      }));

      console.log(`✅ [ProductContext] Productos cargados y mapeados: ${mappedData.length}`);
      setProducts(mappedData);
    } catch (error) {
      console.error('❌ [ProductContext] Error cargando productos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const addProductToState = (newProduct) => {
    // 🦴 GRONK ACTUALIZAR ESTADO LOCAL DIRECTAMENTE
    setProducts((prev) => [newProduct, ...prev]);
  };

  return (
    <ProductContext.Provider value={{ products, isLoading, fetchProducts, addProductToState, setProducts }}>
      {children}
    </ProductContext.Provider>
  );
};
