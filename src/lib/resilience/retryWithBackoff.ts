/**
 * Retry with Exponential Backoff
 * Implements intelligent retry logic with jitter and configurable strategies
 */

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;          // Initial delay in ms
  maxDelay: number;           // Maximum delay cap in ms
  backoffMultiplier: number;  // Exponential multiplier
  jitterFactor: number;       // Random jitter (0-1)
  retryableErrors?: (error: unknown) => boolean;
  onRetry?: (attempt: number, error: unknown, delay: number) => void;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
};

export class RetryError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: unknown
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

function calculateDelay(attempt: number, config: RetryConfig): number {
  // Exponential backoff: baseDelay * (multiplier ^ attempt)
  const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt);
  
  // Apply cap
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay);
  
  // Add jitter to prevent thundering herd
  const jitter = cappedDelay * config.jitterFactor * (Math.random() * 2 - 1);
  
  return Math.max(0, cappedDelay + jitter);
}

function isRetryable(error: unknown, config: RetryConfig): boolean {
  if (config.retryableErrors) {
    return config.retryableErrors(error);
  }

  // Default retryable conditions
  if (error instanceof Error) {
    // Network errors
    if (error.name === 'NetworkError' || error.message.includes('network')) {
      return true;
    }
    // Timeout errors
    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      return true;
    }
    // Server errors (5xx)
    if (error.message.includes('500') || error.message.includes('502') || 
        error.message.includes('503') || error.message.includes('504')) {
      return true;
    }
  }

  // Retry on fetch-related errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  return false;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: unknown;

  for (let attempt = 0; attempt <= fullConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt >= fullConfig.maxRetries || !isRetryable(error, fullConfig)) {
        throw error;
      }

      // Calculate delay for next attempt
      const delay = calculateDelay(attempt, fullConfig);

      // Notify about retry
      if (fullConfig.onRetry) {
        fullConfig.onRetry(attempt + 1, error, delay);
      } else {
        console.warn(
          `[Retry] Attempt ${attempt + 1}/${fullConfig.maxRetries} failed. ` +
          `Retrying in ${Math.round(delay)}ms...`,
          error
        );
      }

      await sleep(delay);
    }
  }

  throw new RetryError(
    `All ${fullConfig.maxRetries} retry attempts failed`,
    fullConfig.maxRetries,
    lastError
  );
}

// Convenience function for HTTP requests
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retryConfig?: Partial<RetryConfig>
): Promise<Response> {
  return retryWithBackoff(async () => {
    const response = await fetch(url, options);
    
    // Throw on server errors to trigger retry
    if (response.status >= 500) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    return response;
  }, {
    ...retryConfig,
    retryableErrors: (error) => {
      // Retry on network errors and 5xx responses
      if (error instanceof TypeError) return true;
      if (error instanceof Error && error.message.includes('Server error')) return true;
      return false;
    },
  });
}
