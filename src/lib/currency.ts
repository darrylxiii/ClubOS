/**
 * Shared currency formatting utilities for the Inventory & Assets system
 */

export const formatCurrency = (value: number | null | undefined): string => {
  return new Intl.NumberFormat('nl-NL', { 
    style: 'currency', 
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
};

export const formatCurrencyCompact = (value: number | null | undefined): string => {
  const num = value || 0;
  if (num >= 1000000) {
    return `€${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `€${(num / 1000).toFixed(0)}k`;
  }
  return formatCurrency(num);
};

export const parseCurrencyInput = (input: string): number => {
  const cleaned = input.replace(/[€\s.,]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};
