/**
 * Restricted CORS for auth-sensitive edge functions.
 * Only allows known origins for password reset & login lockout endpoints.
 */

const ALLOWED_ORIGINS = [
  'https://thequantumclub.lovable.app',
  'https://os.thequantumclub.com',
  'https://app.thequantumclub.nl',
];

// Match any *.lovable.app or *.lovableproject.com preview/published domain
const LOVABLE_PATTERN = /^https:\/\/.*\.lovable(project)?\.(app|com)$/;

// Allow localhost in development
if (Deno.env.get('DENO_ENV') === 'development') {
  ALLOWED_ORIGINS.push('http://localhost:5173', 'http://localhost:8080');
}

export function getAuthCorsOrigin(req: Request): string {
  const origin = req.headers.get('origin') || '';
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  if (LOVABLE_PATTERN.test(origin)) return origin;
  return ALLOWED_ORIGINS[0];
}

export function getAuthCorsHeaders(req: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': getAuthCorsOrigin(req),
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-application-name',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

export function authCorsPreFlight(req: Request): Response {
  return new Response(null, { status: 204, headers: getAuthCorsHeaders(req) });
}
