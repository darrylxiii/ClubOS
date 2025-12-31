/**
 * Request Deduplication
 * Prevents duplicate concurrent requests by coalescing identical requests
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
  subscribers: number;
}

type RequestKey = string;

class RequestDeduplicator {
  private pendingRequests = new Map<RequestKey, PendingRequest<unknown>>();
  private cacheTimeout: number;

  constructor(cacheTimeout = 100) {
    this.cacheTimeout = cacheTimeout;
  }

  /**
   * Execute a request with deduplication
   * If an identical request is already in flight, return its promise instead
   */
  async dedupe<T>(
    key: RequestKey,
    fn: () => Promise<T>,
    options?: { timeout?: number }
  ): Promise<T> {
    const timeout = options?.timeout ?? this.cacheTimeout;
    const existing = this.pendingRequests.get(key) as PendingRequest<T> | undefined;

    // If there's an existing request that's still fresh, reuse it
    if (existing && Date.now() - existing.timestamp < timeout) {
      existing.subscribers++;
      console.debug(`[Dedupe] Reusing in-flight request: ${key} (${existing.subscribers} subscribers)`);
      return existing.promise;
    }

    // Create new request
    const promise = fn()
      .finally(() => {
        // Cleanup after a short delay to allow for rapid re-requests
        setTimeout(() => {
          const current = this.pendingRequests.get(key);
          if (current && current.promise === promise) {
            this.pendingRequests.delete(key);
          }
        }, timeout);
      });

    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
      subscribers: 1,
    });

    return promise;
  }

  /**
   * Generate a cache key from request parameters
   */
  static generateKey(method: string, url: string, body?: unknown): RequestKey {
    const bodyHash = body ? JSON.stringify(body) : '';
    return `${method}:${url}:${bodyHash}`;
  }

  /**
   * Clear all pending requests (useful for testing or cleanup)
   */
  clear(): void {
    this.pendingRequests.clear();
  }

  /**
   * Get stats about pending requests
   */
  getStats(): { pendingCount: number; keys: string[] } {
    return {
      pendingCount: this.pendingRequests.size,
      keys: Array.from(this.pendingRequests.keys()),
    };
  }
}

// Global deduplicator instance
const globalDeduplicator = new RequestDeduplicator();

/**
 * Deduplicated fetch wrapper
 */
export async function deduplicatedFetch(
  url: string,
  options?: RequestInit & { dedupeTimeout?: number }
): Promise<Response> {
  const { dedupeTimeout, ...fetchOptions } = options ?? {};
  const key = RequestDeduplicator.generateKey(
    fetchOptions.method ?? 'GET',
    url,
    fetchOptions.body
  );

  return globalDeduplicator.dedupe(
    key,
    () => fetch(url, fetchOptions),
    { timeout: dedupeTimeout }
  );
}

/**
 * Hook-friendly deduplication for any async operation
 */
export function createDeduplicatedRequest<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  keyFn: (...args: TArgs) => string,
  timeout = 100
): (...args: TArgs) => Promise<TResult> {
  const deduplicator = new RequestDeduplicator(timeout);

  return (...args: TArgs) => {
    const key = keyFn(...args);
    return deduplicator.dedupe(key, () => fn(...args));
  };
}

export { RequestDeduplicator, globalDeduplicator };
