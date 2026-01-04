/**
 * Centralized Currency Formatting Utilities
 * Use these instead of inline formatCurrency implementations
 */

export type SupportedCurrency = 'EUR' | 'USD' | 'GBP';

const LOCALE_MAP: Record<SupportedCurrency, string> = {
  EUR: 'nl-NL',
  USD: 'en-US',
  GBP: 'en-GB',
};

/**
 * Format a number as currency
 * @param value - The amount to format
 * @param currency - Currency code (default: EUR)
 * @param options - Additional formatting options
 */
export const formatCurrency = (
  value: number | null | undefined,
  currency: SupportedCurrency = 'EUR',
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string => {
  const { minimumFractionDigits = 0, maximumFractionDigits = 0 } = options || {};
  
  return new Intl.NumberFormat(LOCALE_MAP[currency], {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value || 0);
};

/**
 * Format currency in compact notation (k, M, B)
 * @param value - The amount to format
 * @param currency - Currency code (default: EUR)
 */
export const formatCurrencyCompact = (
  value: number | null | undefined, 
  currency: SupportedCurrency = 'EUR'
): string => {
  const num = value || 0;
  const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  
  if (num >= 1_000_000_000) {
    return `${symbol}${(num / 1_000_000_000).toFixed(1)}B`;
  }
  if (num >= 1_000_000) {
    return `${symbol}${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${symbol}${(num / 1_000).toFixed(0)}k`;
  }
  return formatCurrency(num, currency);
};

/**
 * Parse a currency string back to a number
 * @param input - The currency string to parse
 */
export const parseCurrencyInput = (input: string): number => {
  const cleaned = input.replace(/[€$£\s.,]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};
