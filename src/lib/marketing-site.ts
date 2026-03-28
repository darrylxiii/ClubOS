const DEFAULT_MARKETING_URL = 'https://thequantumclub.com';

/**
 * Public marketing / funnel site (auth footer “Website” link).
 * Use `VITE_MARKETING_SITE_URL` only — not `VITE_SITE_URL` (reserved for Supabase URL alias in `client.ts`).
 */
export function getMarketingSiteUrl(): string {
  const raw = import.meta.env.VITE_MARKETING_SITE_URL as string | undefined;
  const base = raw?.trim() || DEFAULT_MARKETING_URL;
  return base.replace(/\/$/, '');
}
