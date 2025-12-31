/**
 * Rate Limiting for Client-Side Operations
 * Prevents abuse and protects against DoS
 */

export interface RateLimitConfig {
  maxRequests: number;      // Maximum requests allowed
  windowMs: number;         // Time window in milliseconds
  blockDurationMs?: number; // How long to block after limit exceeded
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
  blocked: boolean;
  blockedUntil?: number;
}

class RateLimiter {
  private limits = new Map<string, RateLimitEntry>();
  private configs = new Map<string, RateLimitConfig>();

  // Default configurations for common operations
  private defaultConfigs: Record<string, RateLimitConfig> = {
    api_call: { maxRequests: 100, windowMs: 60000 },           // 100/min
    auth_attempt: { maxRequests: 5, windowMs: 300000, blockDurationMs: 900000 }, // 5/5min, block 15min
    form_submit: { maxRequests: 10, windowMs: 60000 },         // 10/min
    file_upload: { maxRequests: 20, windowMs: 60000 },         // 20/min
    ai_request: { maxRequests: 30, windowMs: 60000 },          // 30/min
    search: { maxRequests: 50, windowMs: 60000 },              // 50/min
  };

  constructor() {
    // Initialize default configs
    Object.entries(this.defaultConfigs).forEach(([key, config]) => {
      this.configs.set(key, config);
    });
  }

  setConfig(key: string, config: RateLimitConfig): void {
    this.configs.set(key, config);
  }

  /**
   * Check if action is allowed under rate limit
   * Returns true if allowed, false if blocked
   */
  check(key: string, identifier?: string): { allowed: boolean; remaining: number; resetIn: number } {
    const fullKey = identifier ? `${key}:${identifier}` : key;
    const config = this.configs.get(key) ?? this.defaultConfigs.api_call;
    const now = Date.now();

    let entry = this.limits.get(fullKey);

    // Create new entry if none exists
    if (!entry) {
      entry = { count: 0, windowStart: now, blocked: false };
      this.limits.set(fullKey, entry);
    }

    // Check if currently blocked
    if (entry.blocked && entry.blockedUntil) {
      if (now < entry.blockedUntil) {
        return {
          allowed: false,
          remaining: 0,
          resetIn: entry.blockedUntil - now,
        };
      }
      // Block expired, reset
      entry.blocked = false;
      entry.blockedUntil = undefined;
      entry.count = 0;
      entry.windowStart = now;
    }

    // Check if window has expired
    if (now - entry.windowStart >= config.windowMs) {
      entry.count = 0;
      entry.windowStart = now;
    }

    // Check rate limit
    const remaining = Math.max(0, config.maxRequests - entry.count);
    const resetIn = config.windowMs - (now - entry.windowStart);

    if (entry.count >= config.maxRequests) {
      // Apply block if configured
      if (config.blockDurationMs) {
        entry.blocked = true;
        entry.blockedUntil = now + config.blockDurationMs;
      }

      return { allowed: false, remaining: 0, resetIn };
    }

    return { allowed: true, remaining, resetIn };
  }

  /**
   * Record an action (increment counter)
   */
  record(key: string, identifier?: string): void {
    const fullKey = identifier ? `${key}:${identifier}` : key;
    const entry = this.limits.get(fullKey);

    if (entry) {
      entry.count++;
    }
  }

  /**
   * Check and record in one call
   * Returns true if action was allowed and recorded
   */
  checkAndRecord(key: string, identifier?: string): boolean {
    const result = this.check(key, identifier);
    if (result.allowed) {
      this.record(key, identifier);
    }
    return result.allowed;
  }

  /**
   * Get current status for a key
   */
  getStatus(key: string, identifier?: string): {
    count: number;
    limit: number;
    remaining: number;
    blocked: boolean;
    resetIn: number;
  } {
    const fullKey = identifier ? `${key}:${identifier}` : key;
    const config = this.configs.get(key) ?? this.defaultConfigs.api_call;
    const entry = this.limits.get(fullKey);
    const now = Date.now();

    if (!entry) {
      return {
        count: 0,
        limit: config.maxRequests,
        remaining: config.maxRequests,
        blocked: false,
        resetIn: config.windowMs,
      };
    }

    return {
      count: entry.count,
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - entry.count),
      blocked: entry.blocked && entry.blockedUntil ? now < entry.blockedUntil : false,
      resetIn: entry.blockedUntil 
        ? entry.blockedUntil - now 
        : config.windowMs - (now - entry.windowStart),
    };
  }

  /**
   * Reset rate limit for a specific key
   */
  reset(key: string, identifier?: string): void {
    const fullKey = identifier ? `${key}:${identifier}` : key;
    this.limits.delete(fullKey);
  }

  /**
   * Clear all rate limits
   */
  clearAll(): void {
    this.limits.clear();
  }
}

export const rateLimiter = new RateLimiter();

// Decorator/wrapper for rate-limited functions
export function withRateLimit<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  key: string,
  getIdentifier?: (...args: Parameters<T>) => string
): T {
  return (async (...args: Parameters<T>) => {
    const identifier = getIdentifier?.(...args);
    
    if (!rateLimiter.checkAndRecord(key, identifier)) {
      const status = rateLimiter.getStatus(key, identifier);
      throw new RateLimitError(key, status.resetIn);
    }

    return fn(...args);
  }) as T;
}

export class RateLimitError extends Error {
  constructor(
    public readonly limitKey: string,
    public readonly retryAfter: number
  ) {
    super(`Rate limit exceeded for "${limitKey}". Retry after ${Math.ceil(retryAfter / 1000)}s`);
    this.name = 'RateLimitError';
  }
}
