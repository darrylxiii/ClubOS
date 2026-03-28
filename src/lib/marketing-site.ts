const DEFAULT_MARKETING_SITE_URL = 'https://thequantumclub.com';

/** Public marketing / funnel origin (not the Club OS app). Set `VITE_MARKETING_SITE_URL` for previews or alternate domains. */
export function getMarketingSiteUrl(): string {
  const raw = import.meta.env.VITE_MARKETING_SITE_URL as string | undefined;
  const base = raw?.trim() || DEFAULT_MARKETING_SITE_URL;
  return base.replace(/\/$/, '');
}
