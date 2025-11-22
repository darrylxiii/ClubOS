import { useEffect } from "react";
import { trackCoreWebVitals } from "@/utils/performanceMonitoring";

/**
 * Global performance monitoring component
 * Mount once at app level to track Core Web Vitals
 */
export const PerformanceMonitor = () => {
  useEffect(() => {
    // Track Core Web Vitals
    trackCoreWebVitals();

    // Track initial page load
    if (typeof window !== 'undefined' && window.performance) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        const loadTime = navigation.loadEventEnd - navigation.fetchStart;
        const ttfb = navigation.responseStart - navigation.fetchStart;
        const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart;
        
        import("@/utils/performanceMonitoring").then(({ logPerformanceMetric }) => {
          logPerformanceMetric('initial_page_load', loadTime, { metric: 'load' });
          logPerformanceMetric('initial_ttfb', ttfb, { metric: 'ttfb' });
          logPerformanceMetric('initial_dcl', domContentLoaded, { metric: 'dcl' });
        });
      }
    }
  }, []);

  return null;
};
