/**
 * WhatsApp Business API Client
 *
 * Centralized, resilient WhatsApp message sending via Meta Graph API.
 * Provides timeout, retry, and circuit breaker protection.
 */

import { resilientFetch } from './resilient-fetch.ts';
import { getCircuitBreaker } from './circuit-breaker.ts';

const WHATSAPP_API_VERSION = 'v21.0';
const WHATSAPP_API_BASE = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`;
const whatsappBreaker = getCircuitBreaker('whatsapp-meta', { failureThreshold: 5, resetTimeoutMs: 60_000 });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WhatsAppTextMessage {
  type: 'text';
  to: string;
  text: { body: string };
}

export interface WhatsAppTemplateMessage {
  type: 'template';
  to: string;
  template: {
    name: string;
    language: { code: string };
    components?: unknown[];
  };
}

export interface WhatsAppImageMessage {
  type: 'image';
  to: string;
  image: { link?: string; id?: string; caption?: string };
}

export interface WhatsAppDocumentMessage {
  type: 'document';
  to: string;
  document: { link?: string; id?: string; caption?: string; filename?: string };
}

export type WhatsAppMessagePayload =
  | WhatsAppTextMessage
  | WhatsAppTemplateMessage
  | WhatsAppImageMessage
  | WhatsAppDocumentMessage;

export interface SendWhatsAppResult {
  messageId: string;
}

// ---------------------------------------------------------------------------
// Send function
// ---------------------------------------------------------------------------

/**
 * Send a WhatsApp message via Meta Graph API with timeout, retry, and circuit breaker.
 *
 * - 15s timeout per attempt
 * - 2 retries with exponential backoff
 * - Circuit breaker with 5-failure threshold
 *
 * Uses env vars: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID
 * Or accepts explicit values for multi-account setups.
 */
export async function sendWhatsAppMessage(
  payload: WhatsAppMessagePayload,
  options?: {
    phoneNumberId?: string;
    accessToken?: string;
  },
): Promise<SendWhatsAppResult> {
  const accessToken = options?.accessToken || Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  const phoneNumberId = options?.phoneNumberId || Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

  if (!accessToken) throw new Error('WHATSAPP_ACCESS_TOKEN is not configured');
  if (!phoneNumberId) throw new Error('WHATSAPP_PHONE_NUMBER_ID is not configured');

  // Normalize phone number
  const recipientPhone = payload.to.replace(/[^0-9]/g, '');

  const messageBody: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipientPhone,
    type: payload.type,
  };

  // Add type-specific fields
  if (payload.type === 'text') {
    messageBody.text = (payload as WhatsAppTextMessage).text;
  } else if (payload.type === 'template') {
    messageBody.template = (payload as WhatsAppTemplateMessage).template;
  } else if (payload.type === 'image') {
    messageBody.image = (payload as WhatsAppImageMessage).image;
  } else if (payload.type === 'document') {
    messageBody.document = (payload as WhatsAppDocumentMessage).document;
  }

  const url = `${WHATSAPP_API_BASE}/${phoneNumberId}/messages`;

  const { response } = await resilientFetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messageBody),
  }, {
    timeoutMs: 15_000,
    maxRetries: 2,
    retryNonIdempotent: true, // WhatsApp deduplicates by message content + recipient
    circuitBreaker: whatsappBreaker,
    service: 'whatsapp',
    operation: 'send-message',
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'unknown');
    throw new Error(`WhatsApp API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const messageId = data?.messages?.[0]?.id || data?.message_id || 'unknown';

  return { messageId };
}
