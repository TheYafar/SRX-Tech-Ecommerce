import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

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
    console.log("💰 [CurrencyContext] Iniciando obtención de tasa de cambio Binance...");

    try {
      // AbortController para evitar que un fetch colgado bloquee la app
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const response = await fetch(
        'https://ve.dolarapi.com/v1/dolares/binance',
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      // Si la respuesta no es exitosa, lanzamos un error explícito
      if (!response.ok) {
        throw new Error(
          `API respondió con status ${response.status} (${response.statusText})`
        );
      }

      const data = await response.json();
      console.log("📥 [CurrencyContext] Datos recibidos de dolarapi.com:", data);

      if (data?.promedio && typeof data.promedio === 'number') {
        console.log(`✅ [CurrencyContext] Tasa de cambio actualizada con éxito a: ${data.promedio} VES/USD.`);
        setExchangeRate(data.promedio);
      } else {
        throw new Error('La respuesta de la API no contiene un campo "promedio" válido.');
      }
    } catch (err) {
      // ─── No bloqueamos la app. Solo avisamos y usamos la tasa de respaldo ───
      const message = err.name === 'AbortError'
        ? 'La petición a dolarapi.com excedió el tiempo de espera (timeout).'
        : err.message;

      console.warn(
        `⚠️ [CurrencyContext] No se pudo obtener la tasa de cambio: ${message}. ` +
        `Detalles del error:`, err,
        `\nUsando tasa de respaldo: ${FALLBACK_RATE} VES/USD.`
      );

      setError(message);

      // Solo aplicamos fallback si no tenemos ya un valor real previo
      setExchangeRate((prev) => prev ?? FALLBACK_RATE);
    } finally {
      // Garantizamos que el contexto SIEMPRE deje de cargar
      console.log("🏁 [CurrencyContext] Proceso de obtención de tasa finalizado.");
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

