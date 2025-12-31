/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by temporarily blocking requests to failing services
 */

export type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening
  successThreshold: number;      // Number of successes in half-open before closing
  timeout: number;               // Time in ms before transitioning from open to half-open
  resetTimeout?: number;         // Time in ms to reset failure count in closed state
}

interface CircuitStats {
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private successes = 0;
  private lastFailureTime: number | null = null;
  private lastStateChange = Date.now();
  private totalRequests = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;

  constructor(
    private readonly name: string,
    private readonly config: CircuitBreakerConfig
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    if (this.state === 'open') {
      if (Date.now() - this.lastStateChange >= this.config.timeout) {
        this.transitionTo('half-open');
      } else {
        throw new CircuitOpenError(this.name, this.getRemainingTimeout());
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.totalSuccesses++;
    this.failures = 0;

    if (this.state === 'half-open') {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.transitionTo('closed');
      }
    }
  }

  private onFailure(): void {
    this.totalFailures++;
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      this.transitionTo('open');
    } else if (this.state === 'closed' && this.failures >= this.config.failureThreshold) {
      this.transitionTo('open');
    }
  }

  private transitionTo(newState: CircuitState): void {
    console.log(`[CircuitBreaker:${this.name}] ${this.state} → ${newState}`);
    this.state = newState;
    this.lastStateChange = Date.now();

    if (newState === 'half-open' || newState === 'closed') {
      this.successes = 0;
    }
    if (newState === 'closed') {
      this.failures = 0;
    }
  }

  private getRemainingTimeout(): number {
    return Math.max(0, this.config.timeout - (Date.now() - this.lastStateChange));
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats(): CircuitStats {
    return {
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.totalSuccesses > 0 ? Date.now() : null,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
    };
  }

  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.successes = 0;
    this.lastStateChange = Date.now();
  }
}

export class CircuitOpenError extends Error {
  constructor(
    public readonly circuitName: string,
    public readonly retryAfter: number
  ) {
    super(`Circuit breaker "${circuitName}" is open. Retry after ${retryAfter}ms`);
    this.name = 'CircuitOpenError';
  }
}

// Circuit breaker registry for managing multiple circuits
const circuitRegistry = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(
  name: string,
  config: CircuitBreakerConfig = {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000,
  }
): CircuitBreaker {
  if (!circuitRegistry.has(name)) {
    circuitRegistry.set(name, new CircuitBreaker(name, config));
  }
  return circuitRegistry.get(name)!;
}

export function getAllCircuitStats(): Record<string, { state: CircuitState; stats: CircuitStats }> {
  const result: Record<string, { state: CircuitState; stats: CircuitStats }> = {};
  circuitRegistry.forEach((breaker, name) => {
    result[name] = {
      state: breaker.getState(),
      stats: breaker.getStats(),
    };
  });
  return result;
}
