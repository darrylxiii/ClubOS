/**
 * CORS Configuration Helper
 * Unified CORS handling for all edge functions
 */

/**
 * Standard CORS headers that work for all requests
 * Includes all headers that supabase-js and browsers might send
 */
export const publicCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-api-version, x-application-name, traceparent, tracestate',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// Alias for backward compatibility
export const standardCorsHeaders = publicCorsHeaders;

export const restrictedCorsHeaders = {
  'Access-Control-Allow-Origin': 'https://app.thequantumclub.nl',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-api-version, x-application-name, traceparent, tracestate',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
};

/**
 * Get CORS headers based on request origin
 */
export function getCorsHeaders(
  request: Request,
  isSensitive: boolean = false
): Record<string, string> {
  const origin = request.headers.get('origin') || '*';
  
  return {
    'Access-Control-Allow-Origin': origin === '' ? '*' : origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-api-version, x-application-name, traceparent, tracestate',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

/**
 * Handle CORS preflight requests
 * Backward compatible: works with just headers OR with (request, requestId)
 */
export function handleCorsPreFlight(
  headersOrRequest: Record<string, string> | Request,
  requestId?: string
): Response {
  // If first arg is headers object (old API)
  if (!(headersOrRequest instanceof Request)) {
    return new Response(null, { 
      status: 204,
      headers: headersOrRequest 
    });
  }
  
  // New API with Request object
  const origin = headersOrRequest.headers.get('origin') || 'unknown';
  const requestedHeaders = headersOrRequest.headers.get('access-control-request-headers') || 'none';
  
  if (requestId) {
    console.log(`[${requestId}] CORS preflight: origin=${origin}, headers=${requestedHeaders}`);
  }
  
  return new Response(null, { 
    status: 204,
    headers: getCorsHeaders(headersOrRequest, false)
  });
}

/**
 * Create a JSON response with proper CORS headers
 */
export function jsonResponse(
  data: Record<string, unknown>,
  status: number = 200,
  request?: Request
): Response {
  const corsHeaders = request ? getCorsHeaders(request, false) : publicCorsHeaders;
  
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}
