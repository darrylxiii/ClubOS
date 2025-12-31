/**
 * Performance Dashboard Hook
 * Aggregates all performance metrics for the admin dashboard
 */

import { useState, useEffect, useCallback } from 'react';
import {
  performanceBudgetTracker,
  memoryMonitor,
  getJSBundleStats,
  analyzeLoadingWaterfall,
  type BudgetViolation,
  type LeakSuspect,
  type MemorySnapshot,
} from '@/lib/performance';
import { getAllCircuitStats, getSystemHealth } from '@/lib/resilience';

export interface PerformanceMetrics {
  webVitals: {
    lcp: number | null;
    fid: number | null;
    cls: number | null;
    ttfb: number | null;
  };
  memory: MemorySnapshot | null;
  memoryTrend: ReturnType<typeof memoryMonitor.getMemoryTrend>;
  bundleStats: ReturnType<typeof getJSBundleStats>;
  loadingAnalysis: ReturnType<typeof analyzeLoadingWaterfall>;
  budgetViolations: BudgetViolation[];
  leakSuspects: LeakSuspect[];
  circuitBreakers: ReturnType<typeof getAllCircuitStats>;
  systemHealth: ReturnType<typeof getSystemHealth>;
}

export function usePerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const collectMetrics = useCallback((): PerformanceMetrics => {
    return {
      webVitals: {
        lcp: null, // Will be populated by observers
        fid: null,
        cls: null,
        ttfb: performance.timing?.responseStart 
          ? performance.timing.responseStart - performance.timing.navigationStart 
          : null,
      },
      memory: memoryMonitor.getCurrentMemory(),
      memoryTrend: memoryMonitor.getMemoryTrend(),
      bundleStats: getJSBundleStats(),
      loadingAnalysis: analyzeLoadingWaterfall(),
      budgetViolations: performanceBudgetTracker.getViolations(),
      leakSuspects: [],
      circuitBreakers: getAllCircuitStats(),
      systemHealth: getSystemHealth(),
    };
  }, []);

  const refresh = useCallback(() => {
    setIsLoading(true);
    setMetrics(collectMetrics());
    setIsLoading(false);
  }, [collectMetrics]);

  useEffect(() => {
    // Initial collection
    refresh();

    // Start memory monitoring
    memoryMonitor.start(30000); // Every 30 seconds

    // Listen for leak suspects
    const unsubscribeLeak = memoryMonitor.onLeakSuspected((suspect) => {
      setMetrics((prev) => 
        prev ? { ...prev, leakSuspects: [...prev.leakSuspects, suspect] } : prev
      );
    });

    // Listen for budget violations
    const unsubscribeBudget = performanceBudgetTracker.onViolation((violation) => {
      setMetrics((prev) => 
        prev ? { ...prev, budgetViolations: [...prev.budgetViolations, violation] } : prev
      );
    });

    // Auto-refresh
    let intervalId: number | undefined;
    if (autoRefresh) {
      intervalId = window.setInterval(refresh, 10000); // Every 10 seconds
    }

    return () => {
      memoryMonitor.stop();
      unsubscribeLeak();
      unsubscribeBudget();
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefresh, refresh]);

  return {
    metrics,
    isLoading,
    refresh,
    autoRefresh,
    setAutoRefresh,
  };
}
