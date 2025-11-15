import { useState, useEffect } from 'react';

export type CountryCode = string;

interface GeolocationResponse {
  countryCode: string;
  country: string;
}

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

        // Fetch from IP geolocation API
        const response = await fetch('https://ip-api.com/json/?fields=countryCode,country');
        
        if (!response.ok) {
          throw new Error('Failed to detect country');
        }

        const data: GeolocationResponse = await response.json();
        
        if (data.countryCode) {
          setCountryCode(data.countryCode);
          // Cache the result
          localStorage.setItem('detected_country', data.countryCode);
          localStorage.setItem('detected_country_time', Date.now().toString());
        }
      } catch (error) {
        console.log('Country detection failed, using default NL:', error);
        // Fallback to NL (Netherlands - The Quantum Club's primary market)
        setCountryCode('NL');
      } finally {
        setIsLoading(false);
      }
    };

    detectCountry();
  }, []);

  return { countryCode, isLoading };
};
