/**
 * Graceful Degradation System
 * Provides fallback behavior when services are unavailable
 */

import { CircuitOpenError, getCircuitBreaker, type CircuitState } from './circuitBreaker';
import { retryWithBackoff, type RetryConfig } from './retryWithBackoff';

export interface FallbackConfig<T> {
  /** Static fallback value */
  fallbackValue?: T;
  /** Function to generate fallback */
  fallbackFn?: () => T | Promise<T>;
  /** Cache key for storing last known good value */
  cacheKey?: string;
  /** Cache TTL in ms */
  cacheTTL?: number;
  /** Whether to use stale cache if available */
  useStaleCache?: boolean;
}

export interface ResilientRequestConfig<T> extends FallbackConfig<T> {
  /** Circuit breaker name */
  circuitName?: string;
  /** Retry configuration */
  retry?: Partial<RetryConfig>;
  /** Timeout in ms */
  timeout?: number;
  /** Log degradation events */
  onDegradation?: (reason: string, fallback: T) => void;
}

// Simple in-memory cache for last known good values
const cache = new Map<string, { value: unknown; timestamp: number; ttl: number }>();

function getCachedValue<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;

  const isExpired = Date.now() - entry.timestamp > entry.ttl;
  if (isExpired) {
    // Still return stale value but mark for refresh
    console.debug(`[Cache] Stale value for ${key}`);
  }

  return entry.value as T;
}

function setCachedValue<T>(key: string, value: T, ttl: number): void {
  cache.set(key, { value, timestamp: Date.now(), ttl });
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError?: Error
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(timeoutError ?? new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutHandle!);
  }
}

/**
 * Execute a request with full resilience stack:
 * 1. Circuit breaker protection
 * 2. Retry with backoff
 * 3. Timeout handling
 * 4. Graceful degradation with fallbacks
 */
export async function resilientRequest<T>(
  fn: () => Promise<T>,
  config: ResilientRequestConfig<T> = {}
): Promise<T> {
  const {
    circuitName = 'default',
    retry,
    timeout = 30000,
    cacheKey,
    cacheTTL = 300000, // 5 minutes default
    fallbackValue,
    fallbackFn,
    useStaleCache = true,
    onDegradation,
  } = config;

  const circuit = getCircuitBreaker(circuitName);

  const getFallback = async (reason: string): Promise<T> => {
    let fallback: T | undefined;

    // Try cache first
    if (cacheKey && useStaleCache) {
      fallback = getCachedValue<T>(cacheKey);
      if (fallback !== undefined) {
        console.debug(`[Degradation] Using cached value for ${cacheKey}`);
        onDegradation?.(`${reason} - using cached value`, fallback);
        return fallback;
      }
    }

    // Try fallback function
    if (fallbackFn) {
      fallback = await fallbackFn();
      onDegradation?.(`${reason} - using fallback function`, fallback);
      return fallback;
    }

    // Try static fallback
    if (fallbackValue !== undefined) {
      onDegradation?.(`${reason} - using fallback value`, fallbackValue);
      return fallbackValue;
    }

    throw new Error(`No fallback available: ${reason}`);
  };

  try {
    // Execute with circuit breaker
    const result = await circuit.execute(async () => {
      // Add timeout
      const timedRequest = timeout > 0 ? withTimeout(fn(), timeout) : fn();

      // Add retry logic
      if (retry) {
        return retryWithBackoff(() => timedRequest, retry);
      }

      return timedRequest;
    });

    // Cache successful result
    if (cacheKey) {
      setCachedValue(cacheKey, result, cacheTTL);
    }

    return result;
  } catch (error) {
    // Handle circuit open - immediate fallback
    if (error instanceof CircuitOpenError) {
      return getFallback(`Circuit ${error.circuitName} is open`);
    }

    // Handle other errors with fallback
    console.error('[ResilientRequest] Request failed:', error);
    return getFallback(error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Health check for all circuits
 */
export function getSystemHealth(): {
  circuits: Record<string, { state: CircuitState; healthy: boolean }>;
  cacheSize: number;
  overallHealthy: boolean;
} {
  const circuits: Record<string, { state: CircuitState; healthy: boolean }> = {};
  let allHealthy = true;

  // This would need to be expanded to check all registered circuits
  const defaultCircuit = getCircuitBreaker('default');
  const state = defaultCircuit.getState();
  const isHealthy = state === 'closed';

  circuits['default'] = { state, healthy: isHealthy };
  if (!isHealthy) allHealthy = false;

  return {
    circuits,
    cacheSize: cache.size,
    overallHealthy: allHealthy,
  };
}

/**
 * Clear degradation cache
 */
export function clearDegradationCache(): void {
  cache.clear();
}
