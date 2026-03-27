/**
 * Circuit Breaker Pattern
 * Prevents cascading failures by failing fast when an external service is down.
 *
 * States: CLOSED (normal) -> OPEN (failing fast) -> HALF_OPEN (probing) -> CLOSED
 *
 * Module-level singletons persist across warm Deno isolate invocations,
 * accumulating failure counts within a single worker's lifetime.
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  /** Number of consecutive failures before opening the circuit. Default: 5 */
  failureThreshold: number;
  /** How long (ms) the circuit stays open before probing. Default: 60000 */
  resetTimeoutMs: number;
  /** Max concurrent probes in HALF_OPEN state. Default: 1 */
  halfOpenMaxAttempts: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 60_000,
  halfOpenMaxAttempts: 1,
};

export class CircuitBreaker {
  readonly service: string;
  private config: CircuitBreakerConfig;
  private state: CircuitState = 'CLOSED';
  private consecutiveFailures = 0;
  private lastFailureTime = 0;
  private halfOpenAttempts = 0;

  constructor(service: string, config?: Partial<CircuitBreakerConfig>) {
    this.service = service;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  getState(): CircuitState {
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.config.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        this.halfOpenAttempts = 0;
      }
    }
    return this.state;
  }

  /**
   * Check if a request is allowed through the circuit.
   * Throws CircuitBreakerOpenError if the circuit is open.
   */
  allowRequest(): boolean {
    const currentState = this.getState();

    if (currentState === 'CLOSED') return true;

    if (currentState === 'HALF_OPEN') {
      if (this.halfOpenAttempts < this.config.halfOpenMaxAttempts) {
        this.halfOpenAttempts++;
        return true;
      }
      return false;
    }

    // OPEN
    return false;
  }

  /** Record a successful response — resets the circuit to CLOSED. */
  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.halfOpenAttempts = 0;
    this.state = 'CLOSED';
  }

  /** Record a failure — may trip the circuit to OPEN. */
  recordFailure(): void {
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      // Probe failed — re-open
      this.state = 'OPEN';
      return;
    }

    if (this.consecutiveFailures >= this.config.failureThreshold) {
      this.state = 'OPEN';
      console.warn(
        `[CircuitBreaker] ${this.service}: OPEN after ${this.consecutiveFailures} consecutive failures. ` +
        `Will probe again in ${this.config.resetTimeoutMs}ms.`
      );
    }
  }

  /** Force-reset the circuit (e.g. for manual recovery). */
  reset(): void {
    this.state = 'CLOSED';
    this.consecutiveFailures = 0;
    this.halfOpenAttempts = 0;
  }
}

export class CircuitBreakerOpenError extends Error {
  constructor(service: string) {
    super(`Circuit breaker OPEN for service "${service}" — failing fast`);
    this.name = 'CircuitBreakerOpenError';
  }
}

// ---------------------------------------------------------------------------
// Module-level singleton registry
// ---------------------------------------------------------------------------

const breakers = new Map<string, CircuitBreaker>();

/**
 * Get or create a circuit breaker for a service.
 * Returns the same instance across calls within a warm isolate.
 */
export function getCircuitBreaker(
  service: string,
  config?: Partial<CircuitBreakerConfig>,
): CircuitBreaker {
  let cb = breakers.get(service);
  if (!cb) {
    cb = new CircuitBreaker(service, config);
    breakers.set(service, cb);
  }
  return cb;
}
