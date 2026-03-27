/**
 * AI Fetch Utility with Timeout Support and Retry Logic
 * Phase 2: Consistent AI API calls with timeout protection
 * Phase 3: Retry with exponential backoff for transient errors
 * Phase 4: Circuit breaker to fail fast when AI provider is down
 */

import { getCircuitBreaker, CircuitBreakerOpenError } from './circuit-breaker.ts';

// Higher threshold (10) because AI calls are high-volume and we don't want false opens
const aiBreaker = getCircuitBreaker('ai-provider', { failureThreshold: 10, resetTimeoutMs: 30_000 });

export interface AIFetchOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
  maxRetries?: number;
}

export interface AIRequestBody {
  model: string;
  messages: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
  max_completion_tokens?: number;
  tools?: unknown[];
  stream?: boolean;
  [key: string]: unknown;
}

const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds
const DEFAULT_MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1000; // 1 second base for exponential backoff

/**
 * Check if an HTTP status code is retryable (429 or 5xx)
 */
function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599);
}

/**
 * Calculate delay for next retry attempt.
 * Respects Retry-After header for 429 responses, otherwise uses exponential backoff.
 */
function getRetryDelay(attempt: number, response?: Response): number {
  // Check for Retry-After header (used by rate-limiting responses)
  if (response) {
    const retryAfter = response.headers.get('Retry-After');
    if (retryAfter) {
      const retryAfterSeconds = parseInt(retryAfter, 10);
      if (!isNaN(retryAfterSeconds) && retryAfterSeconds > 0) {
        return retryAfterSeconds * 1000;
      }
    }
  }
  // Exponential backoff: 1s, 2s, 4s
  return BASE_BACKOFF_MS * Math.pow(2, attempt);
}

/**
 * Fetch from Google Gemini API (OpenAI-compatible endpoint) with timeout protection
 * and retry with exponential backoff for transient errors (429, 5xx).
 */
export async function fetchAI(
  body: AIRequestBody,
  options: AIFetchOptions = {}
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, maxRetries = DEFAULT_MAX_RETRIES } = options;

  const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
  if (!GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY not configured');
  }

  // Circuit breaker — fail fast when AI provider is consistently down
  if (!aiBreaker.allowRequest()) {
    throw new CircuitBreakerOpenError('ai-provider');
  }

  let lastResponse: Response | undefined;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Create abort controller for timeout (fresh per attempt)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GOOGLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // If response is OK or a non-retryable client error (4xx except 429), return immediately
      if (response.ok || (!isRetryableStatus(response.status) && response.status >= 400)) {
        aiBreaker.recordSuccess();
        return response;
      }

      // Retryable error (5xx or 429) — record failure for circuit breaker
      aiBreaker.recordFailure();
      lastResponse = response;
      if (attempt < maxRetries - 1) {
        const delay = getRetryDelay(attempt, response);
        console.warn(
          `[fetchAI] Attempt ${attempt + 1}/${maxRetries} failed with status ${response.status}. ` +
          `Retrying in ${delay}ms...`
        );
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        aiBreaker.recordFailure();
        throw new AITimeoutError(`AI request timed out after ${timeoutMs}ms`);
      }

      // Network errors are retryable — record failure for circuit breaker
      aiBreaker.recordFailure();
      lastError = error;
      if (attempt < maxRetries - 1) {
        const delay = getRetryDelay(attempt);
        console.warn(
          `[fetchAI] Attempt ${attempt + 1}/${maxRetries} failed with network error: ${error instanceof Error ? error.message : error}. ` +
          `Retrying in ${delay}ms...`
        );
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  // All retries exhausted — return the last response (retryable error) or throw
  if (lastResponse) {
    console.error(`[fetchAI] All ${maxRetries} attempts failed. Last status: ${lastResponse.status}`);
    return lastResponse;
  }

  throw lastError ?? new Error('fetchAI: all retry attempts failed');
}

/**
 * Custom error class for AI timeouts
 */
export class AITimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AITimeoutError';
  }
}

/**
 * Handle AI response errors consistently
 */
export function handleAIError(
  response: Response,
  corsHeaders: Record<string, string>
): Response | null {
  if (response.ok) return null;

  if (response.status === 429) {
    return new Response(
      JSON.stringify({ 
        error: 'AI rate limit exceeded. Please try again later.',
        code: 'AI_RATE_LIMITED'
      }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  if (response.status === 402) {
    return new Response(
      JSON.stringify({ 
        error: 'AI quota exceeded. Please check your Google API billing.',
        code: 'AI_QUOTA_EXCEEDED'
      }),
      { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return null; // Let caller handle other errors
}

/**
 * Create timeout error response
 */
export function createTimeoutResponse(
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: 'AI request timed out. Please try again.',
      code: 'AI_TIMEOUT'
    }),
    { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
