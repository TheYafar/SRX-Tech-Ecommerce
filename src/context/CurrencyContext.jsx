/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CurrencyContext = createContext();

// ──────────────────────────────────────────────
// Tasa de respaldo en caso de que la API falle.
// Actualízala periódicamente para mantenerla realista.
// ──────────────────────────────────────────────
const FALLBACK_RATE = 75.50; // VES por 1 USD
const FETCH_TIMEOUT_MS = 10_000; // 10 segundos máximo de espera

export function CurrencyProvider({ children }) {
  // Arrancamos con la tasa de respaldo para que la app NUNCA se congele
  const [exchangeRate, setExchangeRate] = useState(FALLBACK_RATE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRate = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // AbortController to prevent a hung fetch from blocking the app
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      let response;
      try {
        response = await fetch(
          'https://ve.dolarapi.com/v1/dolares/paralelo',
          { signal: controller.signal }
        );
      } catch (networkErr) {
        // Catch network errors before they trigger browser errors in console
        clearTimeout(timeoutId);
        throw new Error(
          networkErr.name === 'AbortError'
            ? 'La petición a dolarapi.com excedió el tiempo de espera (timeout).'
            : `Error de red al contactar dolarapi.com: ${networkErr.message}`,
          { cause: networkErr }
        );
      }

      clearTimeout(timeoutId);

      // Verify response is successful
      if (!response.ok) {
        throw new Error(
          `API respondió con status ${response.status} (${response.statusText})`
        );
      }

      const data = await response.json();

      if (data?.promedio && typeof data.promedio === 'number') {
        setExchangeRate(data.promedio);
      } else {
        throw new Error('La respuesta de la API no contiene un campo "promedio" válido.');
      }
    } catch (err) {
      console.warn(
        `[CurrencyContext] ${err.message}\n` +
        `   → Usando tasa de respaldo: ${FALLBACK_RATE} VES/USD.`
      );

      setError(err.message);

      // Use fallback if we do not have a previously retrieved rate
      setExchangeRate((prev) => prev ?? FALLBACK_RATE);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Wrap in setTimeout to satisfy strict eslint setState in effect rule
    const timeoutId = setTimeout(() => {
      fetchRate();
    }, 0);
    
    // Refresca cada 30 minutos
    const interval = setInterval(fetchRate, 30 * 60 * 1000);
    return () => {
      clearTimeout(timeoutId);
      clearInterval(interval);
    };
  }, [fetchRate]);

  const formatUSD = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatVES = (amountUSD) => {
    // Ya no necesitamos el guard "if (!exchangeRate)" porque siempre hay un valor
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
    }).format(amountUSD * exchangeRate);
  };

  return (
    <CurrencyContext.Provider
      value={{ exchangeRate, formatUSD, formatVES, isLoading, error, refetchRate: fetchRate }}
    >
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

