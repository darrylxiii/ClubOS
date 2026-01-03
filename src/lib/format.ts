/**
 * Format a number as currency
 */
export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a number as a percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a date in a human-readable way
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('nl-NL', options || {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a number with thousand separators
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('nl-NL').format(value);
}
