/**
 * AI Usage Logging Utility
 * Logs AI function usage for security monitoring and analytics
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

export interface AILogEntry {
  userId?: string;
  functionName: string;
  ipAddress?: string;
  userAgent?: string;
  recaptchaScore?: number;
  recaptchaPassed?: boolean;
  rateLimitHit?: boolean;
  requestPayload?: Record<string, any>;
  tokensUsed?: number;
  responseTimeMs?: number;
  errorMessage?: string;
  success: boolean;
}

/**
 * Log AI function usage to the database
 * 
 * @param entry - Log entry with usage information
 */
export async function logAIUsage(entry: AILogEntry): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase credentials not configured for logging');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase.from('ai_usage_logs').insert({
      user_id: entry.userId || null,
      function_name: entry.functionName,
      ip_address: entry.ipAddress || null,
      user_agent: entry.userAgent || null,
      recaptcha_score: entry.recaptchaScore || null,
      recaptcha_passed: entry.recaptchaPassed || null,
      rate_limit_hit: entry.rateLimitHit || false,
      request_payload: entry.requestPayload || null,
      tokens_used: entry.tokensUsed || null,
      response_time_ms: entry.responseTimeMs || null,
      error_message: entry.errorMessage || null,
      success: entry.success
    });

    if (error) {
      console.error('Failed to log AI usage:', error);
    }
  } catch (error) {
    // Don't throw - logging failures shouldn't break the main function
    console.error('AI logging error:', error);
  }
}

/**
 * Extract client information from request headers
 */
export function extractClientInfo(req: Request): { ipAddress?: string; userAgent?: string } {
  return {
    ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
    userAgent: req.headers.get('user-agent') || undefined
  };
}
