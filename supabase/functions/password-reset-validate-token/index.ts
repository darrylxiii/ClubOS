import { createHandler } from '../_shared/handler.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { checkUserRateLimit, createRateLimitResponse } from '../_shared/rate-limiter.ts';

const requestSchema = z.object({ token: z.string() });

Deno.serve(createHandler(async (req, ctx) => {
  // Rate limiting: 10 requests per hour per IP
  const clientIpForRL = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                        req.headers.get('x-real-ip') ||
                        'unknown';
  const rateLimitResult = await checkUserRateLimit(clientIpForRL, 'password-reset-validate-token', 10, 3600000);
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult.retryAfter || 3600, ctx.corsHeaders);
  }

  try {
    const body = await req.json();
    const { token } = requestSchema.parse(body);
    const clientIp = req.headers.get("x-forwarded-for") || "unknown";

    const { data: tokens, error: lookupError } = await ctx.supabase.from('password_reset_tokens')
      .select('*').eq('magic_token', token).eq('is_used', false)
      .gt('expires_at', new Date().toISOString()).limit(1);
    if (lookupError) throw lookupError;

    const resetToken = tokens?.[0];
    const correlationId = resetToken?.correlation_id || null;

    if (!resetToken) {
      await ctx.supabase.from('password_reset_attempts').insert({ email: 'unknown', ip_address: clientIp, success: false, attempt_type: 'validate_token', correlation_id: correlationId });
      return new Response(JSON.stringify({ valid: false, message: "Invalid or expired token" }), { status: 200, headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } });
    }

    await ctx.supabase.from('password_reset_tokens').update({ is_used: true, used_at: new Date().toISOString(), validated_by: 'magic_link' }).eq('id', resetToken.id);
    await ctx.supabase.from('password_reset_attempts').insert({ email: resetToken.email, ip_address: clientIp, success: true, attempt_type: 'validate_token', correlation_id: correlationId });

    return new Response(JSON.stringify({ valid: true, user_id: resetToken.user_id, email: resetToken.email }), { status: 200, headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("[PasswordReset][validate_token] Error:", error);
    if (error.name === 'ZodError') return new Response(JSON.stringify({ valid: false, error: "Invalid request format" }), { status: 400, headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ valid: false, error: "An error occurred during validation" }), { status: 500, headers: { ...ctx.corsHeaders, "Content-Type": "application/json" } });
  }
}));
