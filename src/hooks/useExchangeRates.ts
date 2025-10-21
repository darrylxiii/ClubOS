import { useEffect } from 'react';
import { updateExchangeRates } from '@/lib/currencyConversion';

/**
 * Hook to automatically update exchange rates every hour
 */
export function useExchangeRates() {
  useEffect(() => {
    // Update immediately on mount
    updateExchangeRates();

    // Then update every hour
    const interval = setInterval(() => {
      updateExchangeRates();
    }, 60 * 60 * 1000); // 1 hour

    return () => clearInterval(interval);
  }, []);
}
