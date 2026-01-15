import { ReactNode, useEffect } from 'react';
import { useComprehensiveTracking } from '@/hooks/useComprehensiveTracking';

interface TrackingProviderProps {
  children: ReactNode;
  enabled?: boolean;
  sampleRate?: number;
}

export function TrackingProvider({ children, enabled = true, sampleRate = 1 }: TrackingProviderProps) {
  // Initialize comprehensive tracking
  useComprehensiveTracking({ enabled, sampleRate });

  // Track performance metrics - deferred to avoid blocking TTI
  useEffect(() => {
    if (!enabled) return;

    const setupObserver = () => {
      if ('PerformanceObserver' in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              console.log('Performance metric:', entry.name, entry);
            }
          });
          observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'first-input'] });
          return () => observer.disconnect();
        } catch (_e) {
          // Observer not supported
        }
      }
    };

    // Defer observer setup to after page becomes interactive
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(setupObserver, { timeout: 5000 });
      return () => cancelIdleCallback(id);
    } else {
      const timeout = setTimeout(setupObserver, 3000);
      return () => clearTimeout(timeout);
    }
  }, [enabled]);

  return <>{children}</>;
}
