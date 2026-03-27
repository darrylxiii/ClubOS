/**
 * Moneybird API Client
 *
 * Centralized, resilient client for all Moneybird accounting operations.
 * Provides timeout, retry, and structured logging.
 */

import { resilientFetch } from './resilient-fetch.ts';

const MONEYBIRD_API_BASE = 'https://moneybird.com/api/v2';

export interface MoneybirdRequestOptions {
  method?: string;
  body?: unknown;
  /** Operation name for logging. */
  operation?: string;
  /** Idempotency key for POST/PATCH mutations to prevent duplicate writes on retry. */
  idempotencyKey?: string;
}

/**
 * Make a request to the Moneybird API with timeout and retry.
 *
 * - 15s timeout per attempt
 * - 2 retries with exponential backoff
 * - Auto-adds administration ID from env
 *
 * @param endpoint - API path after `/api/v2/{administrationId}/` (e.g. `sales_invoices.json`)
 * @param options - HTTP method, body, and operation name
 * @returns Parsed JSON response
 */
export async function moneybirdRequest<T = unknown>(
  endpoint: string,
  options: MoneybirdRequestOptions = {},
): Promise<T> {
  const accessToken = Deno.env.get('MONEYBIRD_ACCESS_TOKEN');
  const administrationId = Deno.env.get('MONEYBIRD_ADMINISTRATION_ID');

  if (!accessToken) throw new Error('MONEYBIRD_ACCESS_TOKEN is not configured');
  if (!administrationId) throw new Error('MONEYBIRD_ADMINISTRATION_ID is not configured');

  const { method = 'GET', body, operation = 'moneybird-request', idempotencyKey } = options;

  const url = `${MONEYBIRD_API_BASE}/${administrationId}/${endpoint}`;

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const fetchInit: RequestInit = { method, headers };
  if (body) {
    fetchInit.body = JSON.stringify(body);
  }

  const { response } = await resilientFetch(url, fetchInit, {
    timeoutMs: 15_000,
    maxRetries: 2,
    retryNonIdempotent: method === 'GET' || !!idempotencyKey, // Retry GET or when idempotency key ensures safety
    service: 'moneybird',
    operation,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown');
    throw new Error(`Moneybird API error (${response.status}): ${errorBody}`);
  }

  return response.json() as Promise<T>;
}
