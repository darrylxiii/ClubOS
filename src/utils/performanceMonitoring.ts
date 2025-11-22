/**
 * Performance Monitoring Utility
 * Tracks and logs performance metrics for analysis
 */

import { supabase } from "@/integrations/supabase/client";

export interface PerformanceContext {
  page?: string;
  action?: string;
  [key: string]: any;
}

/**
 * Log a performance metric to the database
 */
export const logPerformanceMetric = async (
  metricName: string,
  value: number,
  context?: PerformanceContext
): Promise<void> => {
  try {
    // Log to console for now - performance_metrics table will be created in future migration
    console.log(`[PERF] ${metricName}: ${value}ms`, context);
  } catch (error) {
    console.error('Failed to log performance metric:', error);
  }
};

/**
 * Track page load time
 */
export const trackPageLoad = (pageName: string): void => {
  if (typeof window === 'undefined') return;
  
  // Use Performance API to get accurate timing
  window.addEventListener('load', () => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigation) {
      const loadTime = navigation.loadEventEnd - navigation.fetchStart;
      const ttfb = navigation.responseStart - navigation.fetchStart;
      const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart;
      
      logPerformanceMetric('page_load_time', loadTime, { page: pageName, metric: 'load' });
      logPerformanceMetric('time_to_first_byte', ttfb, { page: pageName, metric: 'ttfb' });
      logPerformanceMetric('dom_content_loaded', domContentLoaded, { page: pageName, metric: 'dcl' });
    }
  });
};

/**
 * Track API request performance
 */
export const trackAPIRequest = async (
  endpoint: string,
  duration: number,
  success: boolean
): Promise<void> => {
  await logPerformanceMetric('api_request_time', duration, {
    endpoint,
    success,
    metric: 'api',
  });
};

/**
 * Track user interaction latency
 */
export const trackInteraction = async (
  action: string,
  duration: number
): Promise<void> => {
  await logPerformanceMetric('interaction_latency', duration, {
    action,
    metric: 'interaction',
  });
};

/**
 * Hook to measure component render time
 */
export const measureComponentRender = (componentName: string) => {
  const startTime = performance.now();
  
  return () => {
    const renderTime = performance.now() - startTime;
    logPerformanceMetric('component_render_time', renderTime, {
      component: componentName,
      metric: 'render',
    });
  };
};

/**
 * Get Core Web Vitals
 */
export const trackCoreWebVitals = (): void => {
  if (typeof window === 'undefined') return;
  
  // Track LCP (Largest Contentful Paint)
  if ('PerformanceObserver' in window) {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as any;
      
      if (lastEntry) {
        logPerformanceMetric('largest_contentful_paint', lastEntry.renderTime || lastEntry.loadTime, {
          metric: 'lcp',
        });
      }
    });
    
    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      // LCP not supported in this browser
    }
    
    // Track FID (First Input Delay)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        logPerformanceMetric('first_input_delay', entry.processingStart - entry.startTime, {
          metric: 'fid',
        });
      });
    });
    
    try {
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      // FID not supported in this browser
    }
  }
};
