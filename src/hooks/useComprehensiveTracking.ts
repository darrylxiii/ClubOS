import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { trackingService } from '@/services/trackingService';

interface UseComprehensiveTrackingOptions {
  enabled?: boolean;
  sampleRate?: number;
}

export function useComprehensiveTracking(options: UseComprehensiveTrackingOptions = {}) {
  const { enabled = true, sampleRate = 1 } = options;
  const { user } = useAuth();
  const [ready, setReady] = useState(false);

  const pageEntryTimeRef = useRef<number>(Date.now());
  const scrollDepthRef = useRef<Set<number>>(new Set());
  const lastScrollYRef = useRef<number>(0);
  const mouseIdleTimerRef = useRef<NodeJS.Timeout>();
  const elementsHoveredRef = useRef<Map<string, number>>(new Map());
  const clickCountRef = useRef<Map<string, { count: number; lastClick: number }>>(new Map());

  // Cache userId in trackingService to avoid redundant getUser() calls
  useEffect(() => {
    if (user?.id) {
      trackingService.setUserId(user.id);
    }
  }, [user?.id]);

  // Defer all event listener attachment by 3 seconds after mount
  useEffect(() => {
    if (!enabled || !user) return;
    const timeout = setTimeout(() => setReady(true), 3000);
    return () => clearTimeout(timeout);
  }, [enabled, user]);

  const shouldTrack = useCallback(() => {
    return ready && enabled && Math.random() < sampleRate && user;
  }, [ready, enabled, sampleRate, user]);

  // Track device info on mount (once per session, deferred)
  useEffect(() => {
    if (!ready || !user) return;

    const detectDevice = () => {
      const ua = navigator.userAgent;
      let deviceType = 'desktop';
      if (/mobile/i.test(ua)) deviceType = 'mobile';
      else if (/tablet|ipad/i.test(ua)) deviceType = 'tablet';

      let os = 'Unknown';
      if (/windows/i.test(ua)) os = 'Windows';
      else if (/mac/i.test(ua)) os = 'MacOS';
      else if (/linux/i.test(ua)) os = 'Linux';
      else if (/android/i.test(ua)) os = 'Android';
      else if (/ios|iphone|ipad/i.test(ua)) os = 'iOS';

      let browser = 'Unknown';
      if (/chrome/i.test(ua) && !/edg/i.test(ua)) browser = 'Chrome';
      else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
      else if (/firefox/i.test(ua)) browser = 'Firefox';
      else if (/edg/i.test(ua)) browser = 'Edge';

      return {
        deviceType, os, browser,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    };

    trackingService.trackDeviceInfo(detectDevice());
  }, [ready, user]);

  // Track page entry (deferred)
  useEffect(() => {
    if (!shouldTrack()) return;

    pageEntryTimeRef.current = Date.now();

    trackingService.trackPageEntry({
      pagePath: window.location.pathname,
      referrer: document.referrer,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    });

    return () => {
      const timeOnPage = Math.floor((Date.now() - pageEntryTimeRef.current) / 1000);
      const maxScrollDepth = Math.max(...Array.from(scrollDepthRef.current), 0);

      trackingService.trackPageExit({
        pagePath: window.location.pathname,
        timeOnPage,
        scrollDepthMax: maxScrollDepth,
        exitType: 'navigation',
      });
    };
  }, [shouldTrack, user]);

  // Track scroll behavior
  useEffect(() => {
    if (!shouldTrack()) return;

    const handleScroll = () => {
      const scrollPercent = Math.floor(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      );

      [25, 50, 75, 100].forEach((milestone) => {
        if (scrollPercent >= milestone && !scrollDepthRef.current.has(milestone)) {
          scrollDepthRef.current.add(milestone);
          trackingService.trackEvent({
            eventType: 'scroll',
            scrollDepthPercent: milestone,
            scrollDirection: window.scrollY > lastScrollYRef.current ? 'down' : 'up',
          });
        }
      });

      lastScrollYRef.current = window.scrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [shouldTrack]);

  // Track clicks with rage click detection
  useEffect(() => {
    if (!shouldTrack()) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const elementId = target.id || target.className || target.tagName;
      const elementKey = `${elementId}-${target.tagName}`;

      const now = Date.now();
      const clickData = clickCountRef.current.get(elementKey);

      if (clickData && now - clickData.lastClick < 500) {
        const newCount = clickData.count + 1;
        clickCountRef.current.set(elementKey, { count: newCount, lastClick: now });

        if (newCount >= 3) {
          trackingService.trackFrustrationSignal({
            signalType: 'rage_click',
            elementInfo: { id: target.id, class: target.className, tag: target.tagName, text: target.textContent?.substring(0, 50) },
          });
          clickCountRef.current.delete(elementKey);
        }
      } else {
        clickCountRef.current.set(elementKey, { count: 1, lastClick: now });
      }

      trackingService.trackEvent({
        eventType: 'click',
        elementId: target.id,
        elementClass: target.className,
        elementTag: target.tagName,
        elementText: target.textContent?.substring(0, 100),
        xCoordinate: e.clientX,
        yCoordinate: e.clientY,
      });

      const interactiveTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
      const isInteractive = interactiveTags.includes(target.tagName) || target.onclick !== null || target.getAttribute('role') === 'button';

      if (!isInteractive) {
        trackingService.trackFrustrationSignal({
          signalType: 'dead_click',
          elementInfo: { id: target.id, class: target.className, tag: target.tagName },
        });
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [shouldTrack]);

  // Track hover dwell time
  useEffect(() => {
    if (!shouldTrack()) return;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const elementKey = `${target.id || target.className}-${target.tagName}`;
      if (!elementsHoveredRef.current.has(elementKey)) {
        elementsHoveredRef.current.set(elementKey, Date.now());
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const elementKey = `${target.id || target.className}-${target.tagName}`;
      const hoverStart = elementsHoveredRef.current.get(elementKey);
      if (hoverStart) {
        const timeOnElement = Date.now() - hoverStart;
        if (timeOnElement > 500) {
          trackingService.trackEvent({
            eventType: 'hover',
            elementId: target.id,
            elementClass: target.className,
            elementTag: target.tagName,
            timeOnElementMs: timeOnElement,
          });
        }
        elementsHoveredRef.current.delete(elementKey);
      }
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
    };
  }, [shouldTrack]);

  // Track mouse idle
  useEffect(() => {
    if (!shouldTrack()) return;

    const resetIdleTimer = () => {
      if (mouseIdleTimerRef.current) clearTimeout(mouseIdleTimerRef.current);
      mouseIdleTimerRef.current = setTimeout(() => {
        trackingService.trackEvent({ eventType: 'mouse_idle', metadata: { idleDuration: 5000 } });
      }, 5000);
    };

    document.addEventListener('mousemove', resetIdleTimer);
    resetIdleTimer();

    return () => {
      document.removeEventListener('mousemove', resetIdleTimer);
      if (mouseIdleTimerRef.current) clearTimeout(mouseIdleTimerRef.current);
    };
  }, [shouldTrack]);

  // Track exit intent
  useEffect(() => {
    if (!shouldTrack()) return;

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        trackingService.trackEvent({ eventType: 'exit_intent', metadata: { timeOnPage: Date.now() - pageEntryTimeRef.current } });
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [shouldTrack]);

  // Track tab visibility changes
  useEffect(() => {
    if (!shouldTrack()) return;

    const handleVisibilityChange = () => {
      trackingService.trackEvent({
        eventType: 'navigation',
        metadata: { visible: !document.hidden, action: document.hidden ? 'tab_hidden' : 'tab_visible' },
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [shouldTrack]);

  // Track form interactions
  useEffect(() => {
    if (!shouldTrack()) return;

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        trackingService.trackEvent({
          eventType: 'form_interaction',
          elementId: target.id,
          elementTag: target.tagName,
          metadata: { action: 'focus', fieldName: (target as HTMLInputElement).name },
        });
      }
    };

    const handleBlur = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        trackingService.trackEvent({
          eventType: 'form_interaction',
          elementId: target.id,
          elementTag: target.tagName,
          metadata: { action: 'blur', fieldName: (target as HTMLInputElement).name },
        });
      }
    };

    document.addEventListener('focus', handleFocus, true);
    document.addEventListener('blur', handleBlur, true);
    return () => {
      document.removeEventListener('focus', handleFocus, true);
      document.removeEventListener('blur', handleBlur, true);
    };
  }, [shouldTrack]);

  return {
    trackCustomEvent: trackingService.trackEvent.bind(trackingService),
    trackSearch: trackingService.trackSearch.bind(trackingService),
    trackJourneyStep: trackingService.trackJourneyStep.bind(trackingService),
  };
}
