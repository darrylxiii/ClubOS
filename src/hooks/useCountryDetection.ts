import { useState, useEffect } from 'react';

export type CountryCode = string;

interface GeolocationResponse {
  countryCode?: string;
  country_code?: string;
  country?: string;
}

// Multiple fallback APIs for country detection
const GEO_APIS = [
  {
    url: 'https://ipapi.co/json/',
    parseCode: (data: any) => data.country_code
  },
  {
    url: 'https://ip-api.com/json/?fields=countryCode,country',
    parseCode: (data: any) => data.countryCode
  },
  {
    url: 'https://api.country.is/',
    parseCode: (data: any) => data.country
  }
];

/**
 * Detects user's country from IP with multiple fallback APIs
 * Falls back to browser language detection if all APIs fail
 */
export const useCountryDetection = () => {
  const [countryCode, setCountryCode] = useState<CountryCode>('NL'); // Default to NL for The Quantum Club
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const detectCountry = async () => {
      try {
        // Try to get from localStorage first (cache for 24h)
        const cached = localStorage.getItem('detected_country');
        const cacheTime = localStorage.getItem('detected_country_time');
        
        if (cached && cacheTime) {
          const hoursSinceCache = (Date.now() - parseInt(cacheTime)) / (1000 * 60 * 60);
          if (hoursSinceCache < 24) {
            setCountryCode(cached);
            setIsLoading(false);
            return;
          }
        }

        // Try each API in sequence until one succeeds
        for (const api of GEO_APIS) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout per API
            
            const response = await fetch(api.url, { 
              signal: controller.signal,
              headers: { 'Accept': 'application/json' }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) continue;
            
            const data = await response.json();
            const code = api.parseCode(data);
            
            if (code && typeof code === 'string' && code.length === 2) {
              setCountryCode(code.toUpperCase());
              // Cache the result
              localStorage.setItem('detected_country', code.toUpperCase());
              localStorage.setItem('detected_country_time', Date.now().toString());
              setIsLoading(false);
              return;
            }
          } catch (apiError) {
            // Log but continue to next API
            console.debug(`[CountryDetection] API ${api.url} failed, trying next...`);
            continue;
          }
        }

        // All APIs failed - try browser language detection as fallback
        const browserLang = navigator.language || (navigator as any).userLanguage;
        if (browserLang) {
          // Extract country from locale (e.g., "en-US" -> "US", "nl-NL" -> "NL")
          const parts = browserLang.split('-');
          if (parts.length >= 2 && parts[1].length === 2) {
            const langCountry = parts[1].toUpperCase();
            console.log(`[CountryDetection] Using browser language fallback: ${langCountry}`);
            setCountryCode(langCountry);
            localStorage.setItem('detected_country', langCountry);
            localStorage.setItem('detected_country_time', Date.now().toString());
            setIsLoading(false);
            return;
          }
        }

        // Final fallback to NL (Netherlands - The Quantum Club's primary market)
        console.log('[CountryDetection] All detection methods failed, using default NL');
        setCountryCode('NL');
      } catch (error) {
        console.warn('[CountryDetection] Unexpected error, using default NL:', error);
        setCountryCode('NL');
      } finally {
        setIsLoading(false);
      }
    };

    detectCountry();
  }, []);

  return { countryCode, isLoading };
};
