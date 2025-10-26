/**
 * Rate Limiting Utility for Edge Functions
 * Uses Deno KV for distributed rate limiting across function invocations
 */

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
  remaining?: number;
  limit: number;
}

/**
 * Check if a user is within their rate limit for a specific endpoint
 * 
 * @param userId - The authenticated user's ID
 * @param endpoint - The endpoint name (e.g., 'module-ai-assistant')
 * @param limit - Maximum number of requests allowed in the time window
 * @param windowMs - Time window in milliseconds (default: 1 hour)
 * @returns Rate limit result with allowed status and metadata
 */
export async function checkUserRateLimit(
  userId: string,
  endpoint: string,
  limit: number,
  windowMs: number = 3600000 // 1 hour default
): Promise<RateLimitResult> {
  const kv = await Deno.openKv();
  const rateLimitKey = ['rate_limit', endpoint, userId];
  const now = Date.now();
  
  try {
    // Get existing request timestamps
    const result = await kv.get(rateLimitKey);
    const requests = (result.value as number[]) || [];
    
    // Filter out old requests outside the time window
    const recentRequests = requests.filter(timestamp => now - timestamp < windowMs);
    
    // Check if rate limit exceeded
    if (recentRequests.length >= limit) {
      const oldestRequest = recentRequests[0];
      const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);
      
      return { 
        allowed: false, 
        retryAfter,
        remaining: 0,
        limit
      };
    }
    
    // Add current request timestamp
    recentRequests.push(now);
    
    // Store updated timestamps with expiration
    await kv.set(rateLimitKey, recentRequests, { expireIn: windowMs });
    
    return { 
      allowed: true, 
      remaining: limit - recentRequests.length,
      limit
    };
  } catch (error) {
    console.error('Rate limiter error:', error);
    // On error, allow the request but log it
    return {
      allowed: true,
      remaining: limit,
      limit
    };
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
