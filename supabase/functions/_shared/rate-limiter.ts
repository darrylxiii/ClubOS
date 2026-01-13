/**
 * Rate Limiting Utility for Edge Functions
 * Uses database table for distributed rate limiting across function invocations
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
  remaining?: number;
  limit: number;
}

/**
 * Check if a user is within their rate limit for a specific endpoint
 * Uses ai_rate_limits table instead of Deno KV for compatibility
 * 
 * @param identifier - User ID or IP address
 * @param endpoint - The endpoint name (e.g., 'check-email-exists')
 * @param limit - Maximum number of requests allowed in the time window
 * @param windowMs - Time window in milliseconds (default: 1 hour)
 * @returns Rate limit result with allowed status and metadata
 */
export async function checkUserRateLimit(
  identifier: string,
  endpoint: string,
  limit: number,
  windowMs: number = 3600000 // 1 hour default
): Promise<RateLimitResult> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs);

    // Get existing rate limit record within current window
    const { data: existing, error: fetchError } = await supabase
      .from('ai_rate_limits')
      .select('*')
      .eq('ip_address', identifier)
      .eq('endpoint', endpoint)
      .gte('window_start', windowStart.toISOString())
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('[RateLimit] Fetch error:', fetchError);
      // Fail open: allow request on error to prevent blocking users
      return { allowed: true, remaining: limit, limit };
    }

    // If no recent record or window expired, create new window
    if (!existing || new Date(existing.window_start) < windowStart) {
      const { error: insertError } = await supabase
        .from('ai_rate_limits')
        .insert({
          ip_address: identifier,
          endpoint,
          request_count: 1,
          window_start: now.toISOString()
        });

      if (insertError) {
        console.error('[RateLimit] Insert error:', insertError);
        return { allowed: true, remaining: limit, limit };
      }

      return { allowed: true, remaining: limit - 1, limit };
    }

    // Check if limit exceeded
    if (existing.request_count >= limit) {
      const windowEnd = new Date(new Date(existing.window_start).getTime() + windowMs);
      const retryAfter = Math.ceil((windowEnd.getTime() - now.getTime()) / 1000);

      console.log(`[RateLimit] Limit exceeded for ${identifier} on ${endpoint}: ${existing.request_count}/${limit}`);

      return {
        allowed: false,
        retryAfter,
        remaining: 0,
        limit
      };
    }

    // Increment counter
    const { error: updateError } = await supabase
      .from('ai_rate_limits')
      .update({ 
        request_count: existing.request_count + 1,
        updated_at: now.toISOString()
      })
      .eq('id', existing.id);

    if (updateError) {
      console.error('[RateLimit] Update error:', updateError);
      return { allowed: true, remaining: limit, limit };
    }

    return {
      allowed: true,
      remaining: limit - (existing.request_count + 1),
      limit
    };

  } catch (error) {
    console.error('[RateLimit] Unexpected error:', error);
    // Fail open: allow request on error to prevent blocking users
    return { allowed: true, remaining: limit, limit };
  }
}

/**
 * Create a rate limit error response
 */
export function createRateLimitResponse(retryAfter: number, corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded. Please try again later.',
      retryAfter,
      message: `Too many requests. Please wait ${retryAfter} seconds before trying again.`
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString()
      }
    }
  );
}
