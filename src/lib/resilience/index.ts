/**
 * Resilience Infrastructure
 * Unified exports for all resilience patterns
 */

// Circuit Breaker
export {
  CircuitBreaker,
  CircuitOpenError,
  getCircuitBreaker,
  getAllCircuitStats,
  type CircuitState,
} from './circuitBreaker';

// Retry with Backoff
export {
  retryWithBackoff,
  fetchWithRetry,
  RetryError,
  type RetryConfig,
} from './retryWithBackoff';

// Request Deduplication
export {
  RequestDeduplicator,
  globalDeduplicator,
  deduplicatedFetch,
  createDeduplicatedRequest,
} from './requestDeduplication';

// Graceful Degradation
export {
  resilientRequest,
  getSystemHealth,
  clearDegradationCache,
  type FallbackConfig,
  type ResilientRequestConfig,
} from './gracefulDegradation';
