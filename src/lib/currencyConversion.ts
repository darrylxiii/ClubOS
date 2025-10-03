// Currency conversion rates (updated periodically)
// Base currency: EUR
const EXCHANGE_RATES = {
  EUR: 1,
  USD: 1.09,
  GBP: 0.86,
  AED: 4.00,
} as const;

export type Currency = keyof typeof EXCHANGE_RATES;

export const CURRENCY_SYMBOLS = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  AED: 'د.إ',
} as const;

export const CURRENCY_NAMES = {
  EUR: 'Euro',
  USD: 'US Dollar',
  GBP: 'British Pound',
  AED: 'UAE Dirham',
} as const;

/**
 * Convert amount from one currency to another
 */
export function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency
): number {
  // Convert to EUR first (base currency)
  const amountInEUR = amount / EXCHANGE_RATES[fromCurrency];
  // Then convert to target currency
  const convertedAmount = amountInEUR * EXCHANGE_RATES[toCurrency];
  return Math.round(convertedAmount);
}

/**
 * Format currency with appropriate symbol and formatting
 */
export function formatCurrency(
  amount: number,
  currency: Currency,
  options?: { compact?: boolean }
): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  
  if (options?.compact && amount >= 1000) {
    const thousands = amount / 1000;
    return `${symbol}${thousands.toFixed(0)}k`;
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get user's preferred currency based on location
 * Default is EUR (Amsterdam)
 */
export function getDefaultCurrency(location?: string): Currency {
  if (!location) return 'EUR';
  
  const lowerLocation = location.toLowerCase();
  
  if (lowerLocation.includes('united states') || lowerLocation.includes('usa') || lowerLocation.includes('us')) {
    return 'USD';
  }
  if (lowerLocation.includes('united kingdom') || lowerLocation.includes('uk') || lowerLocation.includes('london')) {
    return 'GBP';
  }
  if (lowerLocation.includes('uae') || lowerLocation.includes('dubai') || lowerLocation.includes('abu dhabi')) {
    return 'AED';
  }
  
  // Default to EUR (Amsterdam and rest of Europe)
  return 'EUR';
}
