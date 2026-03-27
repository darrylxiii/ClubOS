import { useState, useEffect } from 'react';
import { updateExchangeRates, Currency } from '@/lib/currencyConversion';

// Hardcoded fallback rates relative to EUR
const FALLBACK_RATES: Record<string, number> = {
  EUR: 1,
  USD: 1.09,
  GBP: 0.86,
  AED: 4.00,
};

function getRatesFromCache(): Record<string, number> {
  try {
    const cached = localStorage.getItem('exchangeRates');
    if (cached) return JSON.parse(cached);
  } catch (error) {
    console.error('[useLiveFxRate] Failed to parse cached exchange rates:', error);
  }
  return FALLBACK_RATES;
}

/**
 * Returns the live EUR rate for a given currency and a helper to compute
 * the suggested EUR equivalent for a given amount.
 *
 * rate: how many units of `currency` per 1 EUR  (e.g. USD → 1.09)
 * toEur(amount): converts `amount` in `currency` → EUR
 */
export function useLiveFxRate(currency: Currency) {
  const [rates, setRates] = useState<Record<string, number>>(getRatesFromCache);

  useEffect(() => {
    // Trigger a background refresh; update state when done
    updateExchangeRates().then(() => {
      setRates(getRatesFromCache());
    });
  }, []);

  const rate = rates[currency] ?? FALLBACK_RATES[currency] ?? 1;

  function toEur(amount: number): number {
    if (!amount || isNaN(amount)) return 0;
    // amount is in `currency`, divide by rate (units per EUR) to get EUR
    return Math.round((amount / rate) * 100) / 100;
  }

  return { rate, toEur };
}
