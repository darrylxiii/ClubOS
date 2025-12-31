/**
 * Performance Intelligence
 * Unified exports for all performance monitoring utilities
 */

export {
  performanceBudgetTracker,
  setupWebVitalsTracking,
  DEFAULT_BUDGETS,
  type PerformanceBudget,
  type BudgetViolation,
} from './budgetTracker';

export {
  collectResourceTimings,
  getJSBundleStats,
  analyzeLoadingWaterfall,
  trackDynamicImport,
  type BundleStats,
  type ChunkInfo,
  type ResourceTiming,
} from './bundleAnalysis';

export {
  memoryMonitor,
  type MemorySnapshot,
  type LeakSuspect,
} from './memoryLeakDetection';
