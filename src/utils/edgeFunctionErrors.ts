import { FunctionsHttpError } from '@supabase/supabase-js';

export interface EdgeFunctionErrorBody {
  message?: string;
  error?: string;
  attempts_remaining?: number;
  rate_limited?: boolean;
  success?: boolean;
  reused?: boolean;
  reset_token?: string;
  [key: string]: unknown;
}

/**
 * Parse the JSON body from a FunctionsHttpError returned by supabase.functions.invoke().
 * When an edge function returns a non-2xx status, the Supabase client wraps the response
 * in a FunctionsHttpError. The actual JSON body is accessible via error.context.json().
 */
export async function parseEdgeFunctionError(
  error: unknown
): Promise<EdgeFunctionErrorBody | null> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      return body as EdgeFunctionErrorBody;
    } catch (parseError) {
      console.error('[EdgeFunctionErrors] Failed to parse error response body:', parseError);
      return null;
    }
  }
  return null;
}

/**
 * Extract a user-facing message from an edge function error.
 * Falls back to the error's own message or a generic string.
 */
export async function getEdgeFunctionErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
): Promise<string> {
  const body = await parseEdgeFunctionError(error);
  if (body?.message) return body.message;
  if (body?.error) return body.error;
  if (error instanceof Error) return error.message;
  return fallback;
}
