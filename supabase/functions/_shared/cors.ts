/**
 * Origin-Validated CORS Handler
 *
 * Validates the request Origin header against an explicit allowlist and
 * reflects only the matched origin back. This is the recommended CORS
 * strategy for all edge functions.
 *
 * Allowed origins:
 *   - https://os.thequantumclub.com   (production)
 *   - https://app.thequantumclub.nl   (production NL)
 *   - http://localhost:8080           (dev, only when DENO_ENV=development)
 *   - http://localhost:5173           (dev, only when DENO_ENV=development)
 *
 * BACKWARD COMPATIBILITY:
 *   The legacy `corsHeaders` object (wildcard `*`) is still exported for
 *   functions that have not yet been migrated. New code should use
 *   `getCorsHeaders(req)` instead.
 */

const ALLOWED_ORIGINS: string[] = [
  'https://os.thequantumclub.com',
  'https://app.thequantumclub.nl',
];

// Allow localhost origins in development
if (Deno.env.get('DENO_ENV') === 'development') {
  ALLOWED_ORIGINS.push('http://localhost:8080', 'http://localhost:5173');
}

const ALLOWED_HEADERS = [
  'authorization',
  'x-client-info',
  'apikey',
  'content-type',
  'x-api-key',
  'x-supabase-api-version',
  'x-supabase-client-platform',
  'x-supabase-client-platform-version',
  'x-supabase-client-runtime',
  'x-supabase-client-runtime-version',
  'x-application-name',
  'traceparent',
  'tracestate',
].join(', ');

/**
 * Resolve the Origin header to a safe value for Access-Control-Allow-Origin.
 *
 * Returns the request origin verbatim if it appears in the allowlist,
 * otherwise falls back to the primary production origin so the response
 * never contains a wildcard '*'.
 */
export function resolveOrigin(req: Request): string {
  const origin = req.headers.get('origin') || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }
  // Fallback to primary production origin
  return ALLOWED_ORIGINS[0];
}

/**
 * Build a complete set of CORS response headers for the given request.
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': resolveOrigin(req),
    'Access-Control-Allow-Headers': ALLOWED_HEADERS,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

/**
 * Return a 204 No Content response with the appropriate CORS headers.
 * Use this for OPTIONS preflight requests.
 */
export function handleCorsOptions(req: Request): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}

// ---------------------------------------------------------------------------
// LEGACY EXPORT  --  kept for backward compatibility with the 18+ functions
// that still do:  import { corsHeaders } from '../_shared/cors.ts'
// New code should use getCorsHeaders(req) instead.
// ---------------------------------------------------------------------------
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': ALLOWED_HEADERS,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
