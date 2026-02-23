/**
 * IP-based Rate Limiter for unauthenticated verification requests.
 * Limits to maxAttempts per identifier (email/phone) per IP within windowMs.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export interface IPRateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
}

export async function checkIPRateLimit(
  ipAddress: string,
  identifier: string,
  verificationType: 'email' | 'phone',
  maxAttempts = 3,
  windowMs = 30 * 60 * 1000 // 30 minutes
): Promise<IPRateLimitResult> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const windowStart = new Date(Date.now() - windowMs);

    const { data: existing } = await supabase
      .from('verification_ip_rate_limits')
      .select('*')
      .eq('ip_address', ipAddress)
      .eq('identifier', identifier)
      .eq('verification_type', verificationType)
      .gte('window_start', windowStart.toISOString())
      .order('window_start', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!existing) {
      // First request in this window
      await supabase.from('verification_ip_rate_limits').insert({
        ip_address: ipAddress,
        identifier,
        verification_type: verificationType,
        attempt_count: 1,
        window_start: new Date().toISOString(),
      });
      return { allowed: true, remaining: maxAttempts - 1 };
    }

    if (existing.attempt_count >= maxAttempts) {
      const windowEnd = new Date(new Date(existing.window_start).getTime() + windowMs);
      const retryAfterSeconds = Math.ceil((windowEnd.getTime() - Date.now()) / 1000);
      console.log(`[IPRateLimit] Blocked: ${ipAddress} / ${identifier} (${existing.attempt_count}/${maxAttempts})`);
      return { allowed: false, remaining: 0, retryAfterSeconds };
    }

    // Increment
    await supabase
      .from('verification_ip_rate_limits')
      .update({
        attempt_count: existing.attempt_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    return { allowed: true, remaining: maxAttempts - (existing.attempt_count + 1) };
  } catch (error) {
    console.error('[IPRateLimit] Error:', error);
    // Fail open
    return { allowed: true, remaining: maxAttempts };
  }
}
