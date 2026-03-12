/**
 * Standardized CORS headers for all browser-invoked Edge Functions.
 *
 * The Supabase JS client sends platform/runtime headers AND the app sends
 * a custom `x-application-name` header (configured in client.ts).
 * All of these must be listed in Access-Control-Allow-Headers or the
 * browser preflight will fail with "Failed to fetch".
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-application-name, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
