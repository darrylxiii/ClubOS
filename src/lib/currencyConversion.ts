// Currency conversion rates (updated hourly)
// Base currency: EUR
let EXCHANGE_RATES = {
  EUR: 1,
  USD: 1.09,
  GBP: 0.86,
  AED: 4.00,
  BTC: 0.000011, // ~€90,000 per BTC
  ETH: 0.00030,  // ~€3,300 per ETH
} as const;

export type Currency = keyof typeof EXCHANGE_RATES;

export const CURRENCY_SYMBOLS = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  AED: 'د.إ',
  BTC: '₿',
  ETH: 'Ξ',
} as const;

export const CURRENCY_NAMES = {
  EUR: 'Euro',
  USD: 'US Dollar',
  GBP: 'British Pound',
  AED: 'UAE Dirham',
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
} as const;

// Store for dynamic exchange rates
let dynamicRates: Record<string, number> = { ...EXCHANGE_RATES };
let lastUpdate: number = Date.now();

/**
 * Fetch live exchange rates from API
 */
export async function updateExchangeRates(): Promise<void> {
  try {
    // Fetch fiat rates
    const fiatResponse = await fetch(
      'https://api.exchangerate-api.com/v4/latest/EUR'
    );
    const fiatData = await fiatResponse.json();

    // Fetch crypto rates (EUR prices)
    const cryptoResponse = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=eur'
    );
    const cryptoData = await cryptoResponse.json();

    dynamicRates = {
      EUR: 1,
      USD: fiatData.rates?.USD || 1.09,
      GBP: fiatData.rates?.GBP || 0.86,
      AED: fiatData.rates?.AED || 4.00,
      BTC: cryptoData.bitcoin?.eur ? 1 / cryptoData.bitcoin.eur : 0.000011,
      ETH: cryptoData.ethereum?.eur ? 1 / cryptoData.ethereum.eur : 0.00030,
    };

    lastUpdate = Date.now();
    localStorage.setItem('exchangeRates', JSON.stringify(dynamicRates));
    localStorage.setItem('exchangeRatesLastUpdate', lastUpdate.toString());
  } catch (error) {
    console.error('Failed to update exchange rates:', error);
    // Use cached rates or defaults
    const cached = localStorage.getItem('exchangeRates');
    if (cached) {
      dynamicRates = JSON.parse(cached);
    }
  }
}

/**
 * Get current exchange rates (with caching)
 */
function getExchangeRates(): Record<string, number> {
  const oneHour = 60 * 60 * 1000;
  const now = Date.now();

  // Check if we need to update
  if (now - lastUpdate > oneHour) {
    updateExchangeRates();
  }

  return dynamicRates;
}

// Initialize from cache on load
const cachedRates = localStorage.getItem('exchangeRates');
const cachedUpdate = localStorage.getItem('exchangeRatesLastUpdate');
if (cachedRates && cachedUpdate) {
  dynamicRates = JSON.parse(cachedRates);
  lastUpdate = parseInt(cachedUpdate);
}

/**
 * Convert amount from one currency to another
 */
export function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency
): number {
  const rates = getExchangeRates();
  // Convert to EUR first (base currency)
  const amountInEUR = amount / rates[fromCurrency];
  // Then convert to target currency
  const convertedAmount = amountInEUR * rates[toCurrency];
  
  // For crypto, show more precision
  if (toCurrency === 'BTC' || toCurrency === 'ETH') {
    return Math.round(convertedAmount * 100000) / 100000;
  }
  
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
