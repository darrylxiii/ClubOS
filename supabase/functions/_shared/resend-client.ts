/**
 * Resend Email Client
 *
 * Centralized, resilient email sending for all 45+ edge functions.
 * Replaces raw fetch("https://api.resend.com/emails") calls with
 * timeout, retry, and circuit breaker protection.
 */

import { resilientFetch } from './resilient-fetch.ts';
import { getCircuitBreaker } from './circuit-breaker.ts';
import { getEmailHeaders, htmlToPlainText } from './email-config.ts';

const RESEND_API_URL = 'https://api.resend.com/emails';
const resendBreaker = getCircuitBreaker('resend', { failureThreshold: 5, resetTimeoutMs: 60_000 });

export interface SendEmailAttachment {
  /** Filename for the attachment (e.g., "meeting.ics") */
  filename: string;
  /** Base64-encoded content */
  content: string;
  /** MIME type (e.g., "text/calendar; method=REQUEST") */
  content_type?: string;
  /** Alternative: MIME type field name used by some callers */
  type?: string;
}

export interface SendEmailParams {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  /** Plain-text fallback. Auto-generated from HTML if omitted. */
  text?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  /** Custom headers (RFC 8058 List-Unsubscribe added automatically). */
  headers?: Record<string, string>;
  tags?: { name: string; value: string }[];
  /** File attachments (e.g., .ics calendar files). */
  attachments?: SendEmailAttachment[];
}

export interface SendEmailResult {
  id: string;
}

/**
 * Send an email via Resend with timeout, retry, and circuit breaker.
 *
 * - 15s timeout per attempt
 * - 2 retries with exponential backoff
 * - Auto-generates plain-text fallback from HTML
 * - Auto-includes RFC 8058 List-Unsubscribe headers
 *
 * @throws on non-retryable errors or after all retries exhausted
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const toArray = Array.isArray(params.to) ? params.to : [params.to];
  const rfcHeaders = getEmailHeaders();
  const mergedHeaders = { ...rfcHeaders, ...params.headers };
  const plainText = params.text || htmlToPlainText(params.html);

  // Generate idempotency key from recipient + subject + daily bucket to prevent duplicate sends on retry
  const keySource = `${toArray[0]}:${params.subject}:${new Date().toISOString().slice(0, 10)}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keySource);
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const idempotencyKey = hashArray.slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');

  const body = JSON.stringify({
    from: params.from,
    to: toArray,
    subject: params.subject,
    html: params.html,
    text: plainText,
    reply_to: params.replyTo,
    cc: params.cc,
    bcc: params.bcc,
    headers: mergedHeaders,
    tags: params.tags,
    ...(params.attachments?.length ? { attachments: params.attachments } : {}),
  });

  const { response } = await resilientFetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body,
  }, {
    timeoutMs: 15_000,
    maxRetries: 2,
    retryNonIdempotent: true, // Resend deduplicates by Idempotency-Key; safe to retry
    circuitBreaker: resendBreaker,
    service: 'resend',
    operation: 'send-email',
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown');
    throw new Error(`Resend API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return { id: data.id };
}
