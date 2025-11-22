import { useEffect } from "react";
import { logPerformanceMetric, measureComponentRender } from "@/utils/performanceMonitoring";

/**
 * Hook to track component render performance
 */
export const usePerformanceTracking = (componentName: string) => {
  useEffect(() => {
    const cleanup = measureComponentRender(componentName);
    return cleanup;
  }, [componentName]);
};

/**
 * Hook to track user interactions
 */
export const useInteractionTracking = () => {
  const trackClick = async (actionName: string) => {
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      logPerformanceMetric('user_interaction', duration, { action: actionName });
    };
  };

  const trackFormSubmit = async (formName: string) => {
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      logPerformanceMetric('form_submit', duration, { form: formName });
    };
  };

  return {
    trackClick,
    trackFormSubmit,
  };
};
