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

  // Track performance metrics
  useEffect(() => {
    if (!enabled) return;

    // Track Web Vitals when available
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            console.log('Performance metric:', entry.name, entry);
            // Can send to tracking service if needed
          }
        });

        observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'first-input'] });

        return () => observer.disconnect();
      } catch (e) {
        // Observer not supported
      }
    }
  }, [enabled]);

  return <>{children}</>;
}
