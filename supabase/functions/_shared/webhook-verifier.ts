/**
 * Webhook Signature Verification
 *
 * Unified HMAC-based signature verification for all webhook providers.
 * Uses the Web Crypto API (available in Deno) — no external dependencies.
 */

// ---------------------------------------------------------------------------
// Generic HMAC helpers
// ---------------------------------------------------------------------------

async function hmacSign(
  secret: string | Uint8Array,
  payload: string,
  algorithm: 'SHA-1' | 'SHA-256' = 'SHA-256',
): Promise<ArrayBuffer> {
  const keyData = typeof secret === 'string'
    ? new TextEncoder().encode(secret)
    : secret;

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: algorithm },
    false,
    ['sign'],
  );

  return crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function bufToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

/** Constant-time string comparison to prevent timing attacks. */
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const ab = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  let diff = 0;
  for (let i = 0; i < ab.length; i++) {
    diff |= ab[i] ^ bb[i];
  }
  return diff === 0;
}

// ---------------------------------------------------------------------------
// Resend (Svix) webhook verification
// ---------------------------------------------------------------------------

/**
 * Verify a Resend webhook signature (Svix signing scheme).
 *
 * Resend uses Svix for webhooks. The signing payload is:
 *   `${svixId}.${svixTimestamp}.${rawBody}`
 *
 * The secret from the Resend dashboard starts with `whsec_` and is base64-encoded.
 *
 * @param rawBody   - The raw request body as a string
 * @param headers   - The request Headers object
 * @param secret    - The webhook signing secret (starts with `whsec_`)
 */
export async function verifyResendWebhook(
  rawBody: string,
  headers: Headers,
  secret: string,
): Promise<boolean> {
  const svixId = headers.get('svix-id');
  const svixTimestamp = headers.get('svix-timestamp');
  const svixSignature = headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) return false;

  // Reject timestamps older than 5 minutes (replay protection)
  const timestampSec = parseInt(svixTimestamp, 10);
  if (isNaN(timestampSec)) return false;
  const age = Math.abs(Date.now() / 1000 - timestampSec);
  if (age > 300) return false;

  // Remove `whsec_` prefix and decode the base64 secret
  const secretBytes = Uint8Array.from(
    atob(secret.replace(/^whsec_/, '')),
    c => c.charCodeAt(0),
  );

  const signPayload = `${svixId}.${svixTimestamp}.${rawBody}`;
  const sig = await hmacSign(secretBytes, signPayload, 'SHA-256');
  const expected = `v1,${bufToBase64(sig)}`;

  // Svix may send multiple signatures separated by spaces
  const signatures = svixSignature.split(' ');
  return signatures.some(s => secureCompare(s, expected));
}

// ---------------------------------------------------------------------------
// Twilio webhook verification
// ---------------------------------------------------------------------------

/**
 * Verify a Twilio webhook signature (X-Twilio-Signature).
 *
 * Twilio signs: URL + sorted form parameters → SHA1 HMAC → base64.
 *
 * @param url       - The full request URL (must match what Twilio sees)
 * @param params    - The parsed form body as key-value pairs
 * @param signature - The X-Twilio-Signature header value
 * @param authToken - The Twilio Auth Token (used as HMAC key)
 */
export async function verifyTwilioWebhook(
  url: string,
  params: Record<string, string>,
  signature: string,
  authToken: string,
): Promise<boolean> {
  // Sort parameter keys and concatenate key+value
  const sortedKeys = Object.keys(params).sort();
  let dataString = url;
  for (const key of sortedKeys) {
    dataString += key + params[key];
  }

  const sig = await hmacSign(authToken, dataString, 'SHA-1');
  const expected = bufToBase64(sig);

  return secureCompare(signature, expected);
}

// ---------------------------------------------------------------------------
// WhatsApp / Meta webhook verification
// ---------------------------------------------------------------------------

/**
 * Verify a Meta (WhatsApp / Instagram) webhook signature (X-Hub-Signature-256).
 *
 * Meta signs: SHA256 HMAC of raw body using app secret, prefixed with `sha256=`.
 *
 * @param rawBody   - The raw request body as a string
 * @param signature - The X-Hub-Signature-256 header value (e.g. `sha256=abc123...`)
 * @param appSecret - The Facebook/Meta App Secret
 */
export async function verifyWhatsAppWebhook(
  rawBody: string,
  signature: string,
  appSecret: string,
): Promise<boolean> {
  if (!signature.startsWith('sha256=')) return false;

  const expectedHash = signature.slice(7); // remove `sha256=` prefix
  const sig = await hmacSign(appSecret, rawBody, 'SHA-256');
  const actualHash = bufToHex(sig);

  return secureCompare(actualHash, expectedHash);
}

// ---------------------------------------------------------------------------
// Moneybird webhook verification
// ---------------------------------------------------------------------------

/**
 * Verify a Moneybird webhook by token comparison.
 * Moneybird does not support HMAC signing — it sends a token as a URL parameter.
 * This function adds constant-time comparison to the existing token check.
 *
 * @param receivedToken - The token from the webhook URL parameter
 * @param expectedToken - The MONEYBIRD_WEBHOOK_TOKEN env var
 */
export function verifyMoneybirdWebhook(
  receivedToken: string,
  expectedToken: string,
): boolean {
  return secureCompare(receivedToken, expectedToken);
}

// ---------------------------------------------------------------------------
// Generic HMAC verification (for services not listed above)
// ---------------------------------------------------------------------------

/**
 * Generic HMAC signature verification.
 *
 * @param payload   - The raw payload string
 * @param signature - The signature to verify
 * @param secret    - The signing secret
 * @param options   - Algorithm (SHA-256 default), encoding (hex default), prefix
 */
export async function verifyHmacSignature(options: {
  payload: string;
  signature: string;
  secret: string;
  algorithm?: 'SHA-1' | 'SHA-256';
  encoding?: 'hex' | 'base64';
  prefix?: string;
}): Promise<boolean> {
  const {
    payload,
    signature,
    secret,
    algorithm = 'SHA-256',
    encoding = 'hex',
    prefix = '',
  } = options;

  const sig = await hmacSign(secret, payload, algorithm);
  const encoded = encoding === 'hex' ? bufToHex(sig) : bufToBase64(sig);
  const expected = `${prefix}${encoded}`;

  return secureCompare(signature, expected);
}
