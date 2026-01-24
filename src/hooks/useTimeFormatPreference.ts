import { useState, useEffect, useCallback } from 'react';
import { useCountryDetection } from '@/hooks/useCountryDetection';
import { supabase } from '@/integrations/supabase/client';

export type TimeFormat = '12h' | '24h';

const STORAGE_KEY = 'tqc_time_format_preference';

// Countries that predominantly use 12-hour format
const TWELVE_HOUR_COUNTRIES = [
  'US', 'CA', 'AU', 'NZ', 'PH', 'MY', 'IN', 'PK', 'BD', 'EG', 'SA', 'AE', 'KR', 'CO', 'MX',
  'GB', 'IE', // UK and Ireland often display 12h in casual contexts
];

/**
 * Detect system time format preference using browser APIs
 */
function detectSystemTimeFormat(): TimeFormat | null {
  try {
    const locale = navigator.language || 'en-US';
    // Use a type assertion since hourCycle is not in the base TS types but is supported
    const options = Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions() as Intl.ResolvedDateTimeFormatOptions & { hourCycle?: string };
    
    // hourCycle: 'h11', 'h12' = 12-hour; 'h23', 'h24' = 24-hour
    if (options.hourCycle === 'h11' || options.hourCycle === 'h12') {
      return '12h';
    }
    if (options.hourCycle === 'h23' || options.hourCycle === 'h24') {
      return '24h';
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get default format based on country code
 */
function getCountryDefaultFormat(countryCode: string): TimeFormat {
  return TWELVE_HOUR_COUNTRIES.includes(countryCode.toUpperCase()) ? '12h' : '24h';
}

interface UseTimeFormatPreferenceReturn {
  format: TimeFormat;
  source: 'user' | 'storage' | 'system' | 'country' | 'default';
  isLoading: boolean;
  setFormat: (format: TimeFormat) => void;
  toggleFormat: () => void;
}

export function useTimeFormatPreference(): UseTimeFormatPreferenceReturn {
  const { countryCode, isLoading: countryLoading } = useCountryDetection();
  const [format, setFormatState] = useState<TimeFormat>('12h');
  const [source, setSource] = useState<'user' | 'storage' | 'system' | 'country' | 'default'>('default');
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Check for authenticated user
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Determine format based on priority chain
  useEffect(() => {
    const determineFormat = async () => {
      setIsLoading(true);

      // 1. Check authenticated user preference from database
      if (userId) {
        try {
          const { data } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

          // Cast to access time_format which may not be in generated types yet
          const prefs = data as { time_format?: string } | null;
          if (prefs?.time_format && (prefs.time_format === '12h' || prefs.time_format === '24h')) {
            setFormatState(prefs.time_format as TimeFormat);
            setSource('user');
            setIsLoading(false);
            return;
          }
        } catch {
          // Continue to next detection method
        }
      }

      // 2. Check localStorage for anonymous users
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === '12h' || stored === '24h') {
          setFormatState(stored);
          setSource('storage');
          setIsLoading(false);
          return;
        }
      } catch {
        // localStorage not available
      }

      // 3. Detect from system locale
      const systemFormat = detectSystemTimeFormat();
      if (systemFormat) {
        setFormatState(systemFormat);
        setSource('system');
        setIsLoading(false);
        return;
      }

      // 4. Country-based default (wait for country detection)
      if (!countryLoading && countryCode) {
        const countryFormat = getCountryDefaultFormat(countryCode);
        setFormatState(countryFormat);
        setSource('country');
        setIsLoading(false);
        return;
      }

      // 5. Ultimate default
      setFormatState('12h');
      setSource('default');
      setIsLoading(false);
    };

    determineFormat();
  }, [userId, countryCode, countryLoading]);

  // Set format and persist
  const setFormat = useCallback(async (newFormat: TimeFormat) => {
    setFormatState(newFormat);

    // Persist to localStorage for all users (quick access)
    try {
      localStorage.setItem(STORAGE_KEY, newFormat);
    } catch {
      // localStorage not available
    }

    // Persist to database for authenticated users
    if (userId) {
      try {
        await supabase
          .from('user_preferences')
          .upsert({
            user_id: userId,
            time_format: newFormat,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          });
        setSource('user');
      } catch {
        // Database save failed, localStorage backup exists
        setSource('storage');
      }
    } else {
      setSource('storage');
    }
  }, [userId]);

  // Toggle between formats
  const toggleFormat = useCallback(() => {
    setFormat(format === '12h' ? '24h' : '12h');
  }, [format, setFormat]);

  return {
    format,
    source,
    isLoading,
    setFormat,
    toggleFormat,
  };
}
