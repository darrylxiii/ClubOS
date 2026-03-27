/**
 * Edge Function Request Handler Middleware
 *
 * Provides `createHandler` (public endpoints) and `createAuthenticatedHandler`
 * (auth-required endpoints) that eliminate per-function boilerplate:
 *
 *   - CORS preflight (OPTIONS) handling via origin-validated cors.ts
 *   - Supabase service-role client creation
 *   - Optional user authentication via Authorization header
 *   - Top-level try/catch with structured JSON error responses
 *
 * Usage:
 *
 *   // Public endpoint (user may or may not be authenticated)
 *   import { createHandler } from '../_shared/handler.ts';
 *
 *   Deno.serve(createHandler(async (req, ctx) => {
 *     const { text } = await req.json();
 *     return new Response(JSON.stringify({ ok: true }), {
 *       headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' },
 *     });
 *   }));
 *
 *   // Authenticated endpoint (401 if no valid user)
 *   import { createAuthenticatedHandler } from '../_shared/handler.ts';
 *
 *   Deno.serve(createAuthenticatedHandler(async (req, ctx) => {
 *     console.log('user:', ctx.user.id);
 *     return new Response(JSON.stringify({ userId: ctx.user.id }), {
 *       headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' },
 *     });
 *   }));
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsOptions } from './cors.ts';

// Re-export the User type from supabase-js so callers don't need a separate import.
export type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ---- public types --------------------------------------------------------

export interface HandlerContext {
  /** Service-role Supabase client (full DB access). */
  supabase: SupabaseClient;
  /** Authenticated user, or null if the request has no valid token. */
  user: User | null;
  /** Pre-built CORS headers derived from the request Origin. */
  corsHeaders: Record<string, string>;
}

export interface AuthenticatedHandlerContext {
  /** Service-role Supabase client (full DB access). */
  supabase: SupabaseClient;
  /** Guaranteed non-null authenticated user. */
  user: User;
  /** Pre-built CORS headers derived from the request Origin. */
  corsHeaders: Record<string, string>;
}

/** Minimal User shape mirroring Supabase Auth. */
interface User {
  id: string;
  email?: string;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
  [key: string]: unknown;
}

// ---- internals -----------------------------------------------------------

/**
 * Try to extract the authenticated user from the Authorization header.
 * Returns null if there is no header, no Bearer token, or auth fails.
 */
async function resolveUser(req: Request): Promise<User | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) return null;

  try {
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error } = await authClient.auth.getUser();
    if (error || !user) return null;
    return user as unknown as User;
  } catch {
    return null;
  }
}

/**
 * Create a service-role Supabase client for DB operations.
 */
function createServiceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
  }
  return createClient(url, key);
}

// ---- public API ----------------------------------------------------------

/**
 * Wrap a handler function with CORS, Supabase client creation, optional auth,
 * and error handling. The user field in ctx will be null when the request
 * carries no valid token (suitable for public endpoints).
 */
export function createHandler(
  handler: (req: Request, ctx: HandlerContext) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return handleCorsOptions(req);
    }

    const corsHeaders = getCorsHeaders(req);

    try {
      const supabase = createServiceClient();
      const user = await resolveUser(req);

      return await handler(req, { supabase, user, corsHeaders });
    } catch (error) {
      console.error('Unhandled error in edge function:', error);
      const message = error instanceof Error ? error.message : 'Internal server error';
      return new Response(
        JSON.stringify({ error: message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }
  };
}

/**
 * Like `createHandler` but guarantees the user is authenticated.
 * Returns a 401 JSON response when no valid token is present.
 */
export function createAuthenticatedHandler(
  handler: (req: Request, ctx: AuthenticatedHandlerContext) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return handleCorsOptions(req);
    }

    const corsHeaders = getCorsHeaders(req);

    try {
      const user = await resolveUser(req);

      if (!user) {
        return new Response(
          JSON.stringify({ error: 'Authentication required', code: 'UNAUTHORIZED' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      const supabase = createServiceClient();

      return await handler(req, { supabase, user, corsHeaders });
    } catch (error) {
      console.error('Unhandled error in edge function:', error);
      const message = error instanceof Error ? error.message : 'Internal server error';
      return new Response(
        JSON.stringify({ error: message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }
  };
}
