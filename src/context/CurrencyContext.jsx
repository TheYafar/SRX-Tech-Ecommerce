import React, { createContext, useContext, useState, useEffect } from 'react';

const CurrencyContext = createContext();

export function CurrencyProvider({ children }) {
  const [exchangeRate, setExchangeRate] = useState(null); // VES per 1 USD
  const [isLoading, setIsLoading] = useState(true);

  const fetchRate = async () => {
    try {
      // Using an open API that provides Binance P2P rate for Venezuela
      const response = await fetch('https://ve.dolarapi.com/v1/dolares/binance');
      if (response.ok) {
        const data = await response.json();
        setExchangeRate(data.promedio);
      } else {
        console.error('Failed to fetch exchange rate');
        // Fallback realistic rate
        if (!exchangeRate) setExchangeRate(75.50);
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      if (!exchangeRate) setExchangeRate(75.50);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRate();
    // Refresh every 30 minutes
    const interval = setInterval(fetchRate, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatUSD = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatVES = (amountUSD) => {
    if (!exchangeRate) return 'Calculando...';
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
    }).format(amountUSD * exchangeRate);
  };

  return (
    <CurrencyContext.Provider value={{ exchangeRate, formatUSD, formatVES, isLoading }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
