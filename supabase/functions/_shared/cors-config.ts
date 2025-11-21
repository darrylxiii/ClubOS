/**
 * CORS Configuration Helper
 * Phase 2: Restrict CORS for sensitive operations
 */

const PRODUCTION_DOMAIN = 'https://thequantumclub.nl';
const PRODUCTION_APP_DOMAIN = 'https://app.thequantumclub.nl';

/**
 * Standard CORS headers for public endpoints
 * Allows all origins for read-only public data
 */
export const publicCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

/**
 * Restricted CORS headers for authenticated/sensitive endpoints
 * Only allows requests from Quantum Club domains
 */
export const restrictedCorsHeaders = {
  'Access-Control-Allow-Origin': PRODUCTION_APP_DOMAIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Credentials': 'true'
};

/**
 * Get appropriate CORS headers based on request origin and sensitivity
 * For sensitive operations, restrict to known domains
 */
export function getCorsHeaders(
  request: Request,
  isSensitive: boolean = false
): Record<string, string> {
  if (!isSensitive) {
    return publicCorsHeaders;
  }

  const origin = request.headers.get('origin') || '';
  const allowedOrigins = [
    PRODUCTION_DOMAIN,
    PRODUCTION_APP_DOMAIN,
    'http://localhost:5173', // Development
    'http://localhost:8080'  // Development
  ];

  const isAllowedOrigin = allowedOrigins.some(allowed => origin.startsWith(allowed));

  if (isAllowedOrigin) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Credentials': 'true'
    };
  }

  // For non-allowed origins on sensitive endpoints, deny
  return restrictedCorsHeaders;
}

/**
 * Handle CORS preflight requests
 */
export function handleCorsPreFlight(corsHeaders: Record<string, string>): Response {
  return new Response('ok', { headers: corsHeaders });
}
