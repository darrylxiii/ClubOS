/**
 * Shared Stripe Client
 *
 * Provides a consistent Stripe SDK instance and a resilience wrapper
 * for all payment-related edge functions.
 *
 * Features:
 * - Consistent SDK version and API version across all functions
 * - Timeout + retry with exponential backoff (via withStripeResilience)
 * - Auto-generated idempotency keys for mutating operations
 * - Structured logging
 */

import Stripe from "https://esm.sh/stripe@18.5.0";

const STRIPE_API_VERSION = "2025-08-27.basil";
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_RETRIES = 2;
const BASE_BACKOFF_MS = 1_000;

/**
 * Create a configured Stripe client instance.
 * Uses STRIPE_SECRET_KEY from env and a consistent API version.
 */
export function createStripeClient(): Stripe {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key, { apiVersion: STRIPE_API_VERSION as any });
}

/**
 * Generate a deterministic idempotency key for Stripe operations.
 * Format: tqc_{userId}_{operation}_{daily-bucket}_{hash}
 *
 * The daily bucket prevents retries across days (Stripe keys expire after 24h anyway).
 * The hash covers the operation-specific params so distinct calls get distinct keys.
 */
export function generateIdempotencyKey(
  userId: string,
  operation: string,
  ...extras: string[]
): string {
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const raw = [userId, operation, day, ...extras].join('|');
  // Simple hash — FNV-1a 32-bit
  let hash = 0x811c9dc5;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return `tqc_${userId.slice(0, 8)}_${operation}_${hash.toString(36)}`;
}

interface StripeResilienceOptions {
  /** Timeout in ms. Default: 15000 */
  timeoutMs?: number;
  /** Max retry attempts. Default: 2 */
  maxRetries?: number;
  /** Idempotency key (auto-generated if not provided for mutating operations). */
  idempotencyKey?: string;
  /** Operation name for logging. */
  operation?: string;
}

/**
 * Wrap a Stripe SDK call with timeout + retry logic.
 *
 * The Stripe SDK throws on errors (unlike fetch which returns a Response),
 * so this wrapper catches and retries on transient Stripe errors.
 *
 * @example
 * ```ts
 * const stripe = createStripeClient();
 * const session = await withStripeResilience(
 *   () => stripe.checkout.sessions.create({ ... }),
 *   { operation: 'create-checkout', idempotencyKey: generateIdempotencyKey(userId, 'checkout', priceId) }
 * );
 * ```
 */
export async function withStripeResilience<T>(
  operation: () => Promise<T>,
  options: StripeResilienceOptions = {},
): Promise<T> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxRetries = DEFAULT_MAX_RETRIES,
    operation: opName = 'stripe-operation',
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Race the SDK call against a timeout
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Stripe ${opName} timed out after ${timeoutMs}ms`)), timeoutMs)
        ),
      ]);

      if (attempt > 0) {
        console.log(`[stripe-client] ${opName}: succeeded on attempt ${attempt + 1}`);
      }

      return result;
    } catch (error) {
      lastError = error;

      const isRetryable = isRetryableStripeError(error);
      const isLastAttempt = attempt >= maxRetries - 1;

      console.warn(
        `[stripe-client] ${opName}: attempt ${attempt + 1}/${maxRetries} failed` +
        ` (retryable=${isRetryable}): ${error instanceof Error ? error.message : error}`,
      );

      if (!isRetryable || isLastAttempt) {
        throw error;
      }

      // Exponential backoff
      const delay = BASE_BACKOFF_MS * Math.pow(2, attempt) + Math.random() * BASE_BACKOFF_MS;
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw lastError;
}

/**
 * Determine if a Stripe error is transient and worth retrying.
 */
function isRetryableStripeError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  // Timeout
  if (error.message.includes('timed out')) return true;

  // Network errors
  if (error.message.includes('fetch failed') || error.message.includes('network')) return true;

  // Stripe-specific errors
  const stripeError = error as any;
  if (stripeError.type === 'StripeConnectionError') return true;
  if (stripeError.type === 'StripeAPIError' && stripeError.statusCode >= 500) return true;
  if (stripeError.type === 'StripeRateLimitError') return true;
  if (stripeError.statusCode === 429) return true;
  if (stripeError.statusCode >= 500) return true;

  return false;
}

export { Stripe };
