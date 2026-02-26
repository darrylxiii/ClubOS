import { useEffect, useRef, useCallback } from 'react';
import { getAnonymousId, getSessionId } from '@/lib/anonymous-id';

interface UseBlogAnalyticsOptions {
  postSlug: string;
  enabled?: boolean;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Detect device type
const getDeviceType = (): string => {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

export function useBlogAnalytics({ postSlug, enabled = true }: UseBlogAnalyticsOptions) {
  const sessionIdRef = useRef<string>(getSessionId());
  const anonymousIdRef = useRef<string>(getAnonymousId());
  const startTimeRef = useRef<number>(Date.now());
  const maxScrollRef = useRef<number>(0);
  const isTrackedRef = useRef<boolean>(false);
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Send tracking event to edge function
  const sendEvent = useCallback(async (
    type: 'page_view' | 'scroll' | 'cta_click' | 'time_update' | 'exit',
    data?: Record<string, unknown>
  ) => {
    if (!enabled || !postSlug) return;

    try {
      await fetch(`${SUPABASE_URL}/functions/v1/blog-track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          type,
          postSlug,
          anonymousId: anonymousIdRef.current,
          sessionId: sessionIdRef.current,
          data,
        }),
      });
    } catch (error) {
      // Silent fail for analytics - don't disrupt user experience
      console.debug('Blog analytics event failed:', error);
    }
  }, [postSlug, enabled]);

  // Track page view on mount
  useEffect(() => {
    if (!enabled || !postSlug || isTrackedRef.current) return;
    isTrackedRef.current = true;

    sendEvent('page_view', {
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      deviceType: getDeviceType(),
    });

    // Start time tracking interval (every 30 seconds)
    timeUpdateIntervalRef.current = setInterval(() => {
      const timeOnPage = Math.round((Date.now() - startTimeRef.current) / 1000);
      sendEvent('time_update', { timeOnPage });
    }, 30000);

    return () => {
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
      }
    };
  }, [postSlug, enabled, sendEvent]);

  // Track scroll depth
  useEffect(() => {
    if (!enabled || !postSlug) return;

    let scrollTimeout: NodeJS.Timeout | null = null;

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;

      if (scrollPercent > maxScrollRef.current) {
        maxScrollRef.current = scrollPercent;

        // Debounce scroll events - only send every 5 seconds
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          sendEvent('scroll', { scrollDepth: maxScrollRef.current });
        }, 5000);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [postSlug, enabled, sendEvent]);

  // Track exit (on page unload or visibility change)
  useEffect(() => {
    if (!enabled || !postSlug) return;

    const handleExit = () => {
      const timeOnPage = Math.round((Date.now() - startTimeRef.current) / 1000);
      
      // Use sendBeacon for reliable exit tracking
      // Note: sendBeacon doesn't support custom headers, so edge function should accept unauthenticated requests
      const data = JSON.stringify({
        type: 'exit',
        postSlug,
        anonymousId: anonymousIdRef.current,
        sessionId: sessionIdRef.current,
        data: {
          timeOnPage,
          scrollDepth: maxScrollRef.current,
        },
      });

      navigator.sendBeacon(
        `${SUPABASE_URL}/functions/v1/blog-track`,
        data
      );
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleExit();
      }
    };

    window.addEventListener('beforeunload', handleExit);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleExit);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [postSlug, enabled]);

  // Public method to track CTA clicks
  const trackCTAClick = useCallback((ctaType: string, ctaTarget?: string) => {
    sendEvent('cta_click', { ctaType, ctaTarget });
  }, [sendEvent]);

  // Public method to get current session stats
  const getSessionStats = useCallback(() => ({
    timeOnPage: Math.round((Date.now() - startTimeRef.current) / 1000),
    scrollDepth: maxScrollRef.current,
    sessionId: sessionIdRef.current,
  }), []);

  return {
    trackCTAClick,
    getSessionStats,
  };
}

export default useBlogAnalytics;
