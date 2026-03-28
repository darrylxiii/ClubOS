export async function onRequest(context) {
  // CF-IPCountry is automatically provided by Cloudflare
  const country = context.request.headers.get('CF-IPCountry') || 'NL'; // Default to NL if not found
  const city = context.request.headers.get('CF-IPCity') || '';

  // Simple mapping, can be expanded or handled mostly on client
  const COUNTRY_TO_LOCALE = {
    'NL': 'nl', 'BE': 'nl', 
    'DE': 'de', 'AT': 'de', 'CH': 'de',
    'FR': 'fr', 'LU': 'fr', 'MC': 'fr',
    'ES': 'es', 'MX': 'es', 'AR': 'es', 'CO': 'es',
    'CN': 'zh', 'TW': 'zh', 'HK': 'zh',
    'SA': 'ar', 'AE': 'ar', 'QA': 'ar', 'KW': 'ar', 'BH': 'ar', 'OM': 'ar',
    'RU': 'ru', 'BY': 'ru', 'KZ': 'ru',
    'IT': 'it', 'SM': 'it', 'VA': 'it',
    'PT': 'pt', 'BR': 'pt',
    'US': 'en', 'GB': 'en', 'IE': 'en', 'AU': 'en', 'NZ': 'en', 'CA': 'en'
  };

  const COUNTRY_TO_CURRENCY = {
    'NL': 'EUR', 'BE': 'EUR', 'DE': 'EUR', 'AT': 'EUR', 'FR': 'EUR', 'ES': 'EUR', 'IT': 'EUR', 'PT': 'EUR', 'IE': 'EUR',
    'GB': 'GBP',
    'US': 'USD',
    'CH': 'CHF',
    'SA': 'SAR', 'AE': 'AED',
    'CN': 'CNY',
    'RU': 'RUB',
    'AU': 'AUD',
    'CA': 'CAD'
  };

  const COUNTRY_TO_TZ = {
    'NL': 'Europe/Amsterdam',
    'DE': 'Europe/Berlin',
    'FR': 'Europe/Paris',
    'ES': 'Europe/Madrid',
    'IT': 'Europe/Rome',
    'GB': 'Europe/London',
    'US': 'America/New_York', // Simplified, client timezone is better
  };

  const locale = COUNTRY_TO_LOCALE[country] || 'en';
  const currency = COUNTRY_TO_CURRENCY[country] || 'EUR';
  const timezone = COUNTRY_TO_TZ[country] || 'Europe/Amsterdam';

  return new Response(
    JSON.stringify({ country, city, locale, currency, timezone, isEU: ['NL', 'BE', 'DE', 'AT', 'FR', 'ES', 'IT', 'PT', 'IE', 'LU'].includes(country) }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour at the edge
      },
    }
  );
}
