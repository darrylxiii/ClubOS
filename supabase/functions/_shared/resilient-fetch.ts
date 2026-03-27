/**
 * Resilient Fetch — drop-in fetch() replacement with timeout, retry, and circuit breaker.
 *
 * Every external API call in the system should route through this utility.
 * It follows the existing ai-fetch.ts conventions (AbortController timeout,
 * exponential backoff) while being service-agnostic.
 */

import {
  CircuitBreaker,
  CircuitBreakerOpenError,
} from './circuit-breaker.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ResilientFetchOptions {
  /** Timeout per attempt in ms. Default: 30000 */
  timeoutMs?: number;
  /** Maximum total attempts (1 = no retry). Default: 3 */
  maxRetries?: number;
  /** Base delay for exponential backoff in ms. Default: 1000 */
  baseDelayMs?: number;
  /** Maximum backoff delay in ms. Default: 30000 */
  maxDelayMs?: number;
  /** HTTP status codes that trigger a retry. Default: [429, 500, 502, 503, 504] */
  retryableStatuses?: number[];
  /** Allow retrying non-idempotent methods (POST, PATCH, DELETE). Default: false */
  retryNonIdempotent?: boolean;
  /** Optional circuit breaker instance (use getCircuitBreaker()). */
  circuitBreaker?: CircuitBreaker;
  /** Service name for logging (e.g. "stripe", "resend"). */
  service?: string;
  /** Operation name for logging (e.g. "create-checkout"). */
  operation?: string;
  /** External AbortSignal — composed with the internal timeout signal. */
  signal?: AbortSignal;
}

export interface ResilientFetchResult {
  response: Response;
  attempts: number;
  totalDurationMs: number;
}

// ---------------------------------------------------------------------------
// Error classes
// ---------------------------------------------------------------------------

export class ResilientFetchTimeoutError extends Error {
  constructor(service: string, timeoutMs: number) {
    super(`[${service}] Request timed out after ${timeoutMs}ms`);
    this.name = 'ResilientFetchTimeoutError';
  }
}

export class RetriesExhaustedError extends Error {
  lastStatus?: number;
  constructor(service: string, attempts: number, lastStatus?: number) {
    super(`[${service}] All ${attempts} attempts failed (last status: ${lastStatus ?? 'network error'})`);
    this.name = 'RetriesExhaustedError';
    this.lastStatus = lastStatus;
  }
}

// Re-export for convenience
export { CircuitBreakerOpenError } from './circuit-breaker.ts';

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULTS = {
  timeoutMs: 30_000,
  maxRetries: 3,
  baseDelayMs: 1_000,
  maxDelayMs: 30_000,
  retryableStatuses: [429, 500, 502, 503, 504],
} as const;

const NON_IDEMPOTENT_METHODS = new Set(['POST', 'PATCH', 'DELETE']);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRetryDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  response?: Response,
): number {
  // Respect Retry-After header on 429
  if (response) {
    const retryAfter = response.headers.get('Retry-After');
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds) && seconds > 0) {
        return Math.min(seconds * 1000, maxDelayMs);
      }
    }
  }
  // Exponential backoff with jitter
  const exponential = baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * baseDelayMs;
  return Math.min(exponential + jitter, maxDelayMs);
}

function shouldRetry(
  status: number,
  method: string,
  retryableStatuses: number[],
  retryNonIdempotent: boolean,
): boolean {
  if (!retryableStatuses.includes(status)) return false;
  if (NON_IDEMPOTENT_METHODS.has(method.toUpperCase()) && !retryNonIdempotent) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Drop-in replacement for `fetch()` with timeout, retry, and circuit breaker.
 *
 * @example
 * ```ts
 * const { response } = await resilientFetch(
 *   'https://api.resend.com/emails',
 *   { method: 'POST', headers: { ... }, body: JSON.stringify(payload) },
 *   { timeoutMs: 15000, maxRetries: 2, service: 'resend', operation: 'send-email' },
 * );
 * ```
 */
export async function resilientFetch(
  url: string,
  init: RequestInit = {},
  options: ResilientFetchOptions = {},
): Promise<ResilientFetchResult> {
  const {
    timeoutMs = DEFAULTS.timeoutMs,
    maxRetries = DEFAULTS.maxRetries,
    baseDelayMs = DEFAULTS.baseDelayMs,
    maxDelayMs = DEFAULTS.maxDelayMs,
    retryableStatuses = DEFAULTS.retryableStatuses,
    retryNonIdempotent = false,
    circuitBreaker,
    service = 'unknown',
    operation = '',
    signal: externalSignal,
  } = options;

  const method = (init.method ?? 'GET').toUpperCase();
  const overallStart = Date.now();

  // Circuit breaker check
  if (circuitBreaker && !circuitBreaker.allowRequest()) {
    throw new CircuitBreakerOpenError(service);
  }

  let lastResponse: Response | undefined;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // --- Per-attempt timeout via AbortController ---
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Compose with external signal if provided
    const onExternalAbort = () => controller.abort();
    if (externalSignal) {
      if (externalSignal.aborted) {
        clearTimeout(timeoutId);
        throw new ResilientFetchTimeoutError(service, timeoutMs);
      }
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }

    const attemptStart = Date.now();
    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', onExternalAbort);

      const durationMs = Date.now() - attemptStart;

      // Log the external call
      console.log(JSON.stringify({
        level: 'info',
        event: 'external_api_call',
        service,
        operation,
        url: url.replace(/[?&](api|token|key)=[^&]*/gi, '$1=***'),
        method,
        statusCode: response.status,
        durationMs,
        attempt: attempt + 1,
        maxRetries,
      }));

      // Success or non-retryable status → return
      if (response.ok || !shouldRetry(response.status, method, retryableStatuses, retryNonIdempotent)) {
        circuitBreaker?.recordSuccess();
        return { response, attempts: attempt + 1, totalDurationMs: Date.now() - overallStart };
      }

      // Retryable status
      lastResponse = response;
      circuitBreaker?.recordFailure();

      if (attempt < maxRetries - 1) {
        const delay = getRetryDelay(attempt, baseDelayMs, maxDelayMs, response);
        console.warn(
          `[resilientFetch] ${service}/${operation}: attempt ${attempt + 1}/${maxRetries} got ${response.status}. ` +
          `Retrying in ${Math.round(delay)}ms...`,
        );
        await new Promise(r => setTimeout(r, delay));
      }
    } catch (error) {
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', onExternalAbort);

      if (error instanceof Error && error.name === 'AbortError') {
        // Could be timeout or external cancellation
        if (externalSignal?.aborted) {
          throw new ResilientFetchTimeoutError(service, timeoutMs);
        }
        throw new ResilientFetchTimeoutError(service, timeoutMs);
      }

      lastError = error;
      circuitBreaker?.recordFailure();

      // Network errors are retryable (regardless of method)
      if (attempt < maxRetries - 1) {
        const delay = getRetryDelay(attempt, baseDelayMs, maxDelayMs);
        console.warn(
          `[resilientFetch] ${service}/${operation}: attempt ${attempt + 1}/${maxRetries} network error: ` +
          `${error instanceof Error ? error.message : error}. Retrying in ${Math.round(delay)}ms...`,
        );
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  // All retries exhausted
  if (lastResponse) {
    return {
      response: lastResponse,
      attempts: maxRetries,
      totalDurationMs: Date.now() - overallStart,
    };
  }

  throw lastError ?? new RetriesExhaustedError(service, maxRetries, lastResponse && (lastResponse as Response).status);
}
