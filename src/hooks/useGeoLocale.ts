import { useEffect, useState } from 'react';
import i18n from '@/i18n/config';

export interface GeoInfo {
  country: string;
  city: string;
  locale: string;
  currency: string;
  timezone: string;
  isEU: boolean;
}

const DEFAULT_GEO: GeoInfo = {
  country: 'NL',
  city: '',
  locale: 'en',
  currency: 'EUR',
  timezone: 'Europe/Amsterdam',
  isEU: true
};

export function useGeoLocale() {
  const [geoInfo, setGeoInfo] = useState<GeoInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function detectGeo() {
      // 1. Check if user already set a preference manually
      const savedLocale = localStorage.getItem('i18nextLng');
      const hasForcedOverride = localStorage.getItem('tqc_geo_override_done');
      
      try {
        const res = await fetch('/geo-detect');
        if (!res.ok) throw new Error('Geo API failed');
        const data: GeoInfo = await res.json();
        
        setGeoInfo(data);

        // Save geo-detected locale to local storage so standard app components can use it
        localStorage.setItem('tqc_geo_country', data.country);
        localStorage.setItem('tqc_geo_currency', data.currency);
        localStorage.setItem('tqc_geo_timezone', data.timezone);
        
        // 2. ONLY auto-switch if the user hasn't explicitly set a language
        if (!hasForcedOverride && (!savedLocale || savedLocale === 'en')) {
          const browserLang = navigator.language.split('-')[0];
          // Prefer cloudflare detection, then browser, then 'en'
          const targetLocale = data.locale || browserLang || 'en';
          
          if (targetLocale !== i18n.language) {
            console.log(`🌍 Geo detected ${data.country}, switching to ${targetLocale}`);
            i18n.changeLanguage(targetLocale);
            localStorage.setItem('tqc_geo_override_done', 'true');
          }
        }
      } catch (err) {
        console.warn('Geo detection failed, falling back to browser:', err);
        setGeoInfo(DEFAULT_GEO);
        
        // Fallback to browser lang if no preference
        if (!hasForcedOverride && (!savedLocale || savedLocale === 'en')) {
          const browserLang = navigator.language.split('-')[0];
          if (browserLang && browserLang !== i18n.language) {
            i18n.changeLanguage(browserLang);
            localStorage.setItem('tqc_geo_override_done', 'true');
          }
        }
      } finally {
        setLoading(false);
      }
    }

    // Only run this ONCE per session (stored in sessionStorage)
    const sessionChecked = sessionStorage.getItem('tqc_session_geo_check');
    if (!sessionChecked) {
      detectGeo();
      sessionStorage.setItem('tqc_session_geo_check', 'true');
    } else {
      setLoading(false);
      // Restore from local storage if available
      const storedCountry = localStorage.getItem('tqc_geo_country');
      if (storedCountry) {
        setGeoInfo({
          country: storedCountry,
          city: '',
          locale: localStorage.getItem('i18nextLng') || 'en',
          currency: localStorage.getItem('tqc_geo_currency') || 'EUR',
          timezone: localStorage.getItem('tqc_geo_timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone,
          isEU: ['NL', 'BE', 'DE', 'AT', 'FR', 'ES', 'IT', 'PT', 'IE', 'LU'].includes(storedCountry)
        });
      }
    }
  }, []);

  return { geoInfo, loading };
}
