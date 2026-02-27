/**
 * Centralized VAT Rate Utilities
 * 
 * All VAT calculations must use these functions instead of hardcoding / 1.21.
 * The edge function (moneybird-fetch-financials) already stores NET amounts.
 * These utilities are fallbacks for when net_amount is NULL on invoice rows.
 */

const ENTITY_VAT_RATES: Record<string, number> = {
  tqc_nl: 0.21,
  tqc_dubai: 0.05,
};

/**
 * Get the VAT rate for a legal entity.
 * Returns 0.21 (NL default) when entity is unknown or 'all'.
 */
export function getVATRate(legalEntity?: string): number {
  if (!legalEntity || legalEntity === 'all') return 0.21;
  return ENTITY_VAT_RATES[legalEntity] ?? 0.21;
}

/**
 * Convert a gross (incl. VAT) amount to net (excl. VAT).
 */
export function grossToNet(gross: number, legalEntity?: string): number {
  return gross / (1 + getVATRate(legalEntity));
}

/**
 * Convert a net (excl. VAT) amount to gross (incl. VAT).
 */
export function netToGross(net: number, legalEntity?: string): number {
  return net * (1 + getVATRate(legalEntity));
}

/**
 * Calculate VAT amount from gross.
 */
export function vatFromGross(gross: number, legalEntity?: string): number {
  return gross - grossToNet(gross, legalEntity);
}
