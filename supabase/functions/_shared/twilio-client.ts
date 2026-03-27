/**
 * Twilio SMS Client
 *
 * Centralized, resilient SMS sending with timeout and retry.
 * Moves the Twilio error code mapping into the shared layer.
 */

import { resilientFetch } from './resilient-fetch.ts';

/** Common Twilio error codes mapped to user-friendly messages. */
const TWILIO_ERROR_MAP: Record<number, string> = {
  20003: 'Permission denied',
  20404: 'Invalid phone number format',
  20429: 'Too many requests — please try again later',
  21211: 'Invalid phone number',
  21214: 'Phone number not reachable',
  21217: 'Phone number does not support SMS',
  21219: 'Phone number is blocked',
  21408: 'Permission to send not granted for this region',
  21421: 'Phone number is invalid for the selected country',
  21601: 'Phone number is not a valid mobile number',
  21602: 'Message body is required',
  21610: 'Recipient has unsubscribed',
  21611: 'Message body exceeds max length (1600 chars)',
  21612: 'SMS is not supported in this region',
  21614: 'Phone is not a mobile number',
  21617: 'Message body is too long',
  30001: 'Message queued but not sent (carrier issue)',
  30003: 'Unreachable destination',
  30004: 'Message blocked by carrier',
  30005: 'Unknown destination',
  30006: 'Landline or unreachable number',
};

export interface SendSMSParams {
  to: string;
  body: string;
  statusCallback?: string;
}

export interface SendSMSResult {
  sid: string;
  status: string;
}

/**
 * Send an SMS via Twilio with timeout and retry.
 *
 * - 10s timeout per attempt
 * - 1 retry (conservative — double-sending SMS is worse than not sending)
 * - Maps Twilio error codes to user-friendly messages
 *
 * @throws TwilioSendError on API errors
 */
export async function sendSMS(params: SendSMSParams): Promise<SendSMSResult> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Twilio credentials not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)');
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = btoa(`${accountSid}:${authToken}`);

  const formData = new URLSearchParams();
  formData.append('To', params.to);
  formData.append('From', fromNumber);
  formData.append('Body', params.body);
  if (params.statusCallback) {
    formData.append('StatusCallback', params.statusCallback);
  }

  const { response } = await resilientFetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  }, {
    timeoutMs: 10_000,
    maxRetries: 1,
    retryNonIdempotent: false, // Do not retry SMS sends — double-send risk
    service: 'twilio',
    operation: 'send-sms',
  });

  const data = await response.json();

  if (!response.ok) {
    const twilioCode = data.code as number | undefined;
    const friendlyMessage = twilioCode ? TWILIO_ERROR_MAP[twilioCode] : undefined;
    throw new TwilioSendError(
      friendlyMessage || data.message || `Twilio error ${response.status}`,
      twilioCode,
      response.status,
    );
  }

  return { sid: data.sid, status: data.status };
}

export class TwilioSendError extends Error {
  twilioCode?: number;
  httpStatus: number;
  constructor(message: string, twilioCode?: number, httpStatus: number = 500) {
    super(message);
    this.name = 'TwilioSendError';
    this.twilioCode = twilioCode;
    this.httpStatus = httpStatus;
  }
}
