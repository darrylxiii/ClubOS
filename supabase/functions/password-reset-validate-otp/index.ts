import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getAuthCorsHeaders, authCorsPreFlight } from "../_shared/auth-cors.ts";

const MAX_ATTEMPTS = 5;

const requestSchema = z.object({
  email: z.string().email(),
  otp_code: z.string().length(6),
});

async function verifyValue(value: string, stored: string): Promise<boolean> {
  if (!stored.includes(':')) return false;
  const [saltHex] = stored.split(':');
  const saltBytes = new Uint8Array(saltHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(value), 'PBKDF2', false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: saltBytes, iterations: 100000, hash: 'SHA-256' }, keyMaterial, 256);
  const hashHex = Array.from(new Uint8Array(derived)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${saltHex}:${hashHex}` === stored;
}

async function checkAndRaiseAlert(supabaseAdmin: any, email: string, clientIp: string, correlationId: string | null) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabaseAdmin.from('password_reset_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('email', email).eq('success', false)
    .in('attempt_type', ['validate_otp', 'validate_token', 'set_password'])
    .gte('attempted_at', oneHourAgo);
  if (count && count >= 3) {
    await supabaseAdmin.from('security_alerts').insert({
      alert_type: 'password_reset_brute_force', email, ip_address: clientIp,
      details: { failed_attempts: count, correlation_id: correlationId, stage: 'validate_otp' },
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return authCorsPreFlight(req);

  const corsHeaders = getAuthCorsHeaders(req);

  try {
    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const body = await req.json();
    const { email, otp_code } = requestSchema.parse(body);
    const clientIp = req.headers.get("x-forwarded-for") || "unknown";

    const { data: tokens, error: lookupError } = await supabaseAdmin.from('password_reset_tokens')
      .select('*').eq('email', email.toLowerCase()).eq('is_used', false)
      .gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(1);
    if (lookupError) throw lookupError;

    const token = tokens?.[0];
    const correlationId = token?.correlation_id || null;

    if (!token) {
      await supabaseAdmin.from('password_reset_attempts').insert({ email: email.toLowerCase(), ip_address: clientIp, success: false, attempt_type: 'validate_otp', correlation_id: correlationId });
      return new Response(JSON.stringify({ success: false, message: "Invalid or expired code" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (token.attempts >= MAX_ATTEMPTS) {
      await supabaseAdmin.from('password_reset_attempts').insert({ email: email.toLowerCase(), ip_address: clientIp, success: false, attempt_type: 'validate_otp', correlation_id: correlationId });
      await checkAndRaiseAlert(supabaseAdmin, email.toLowerCase(), clientIp, correlationId);
      return new Response(JSON.stringify({ success: false, message: "Too many failed attempts. Please request a new code.", attempts_remaining: 0 }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await supabaseAdmin.from('password_reset_tokens').update({ attempts: token.attempts + 1 }).eq('id', token.id);
    const attemptsRemaining = MAX_ATTEMPTS - (token.attempts + 1);

    const otpMatches = await verifyValue(otp_code, token.otp_code);

    if (!otpMatches) {
      await supabaseAdmin.from('password_reset_attempts').insert({ email: email.toLowerCase(), ip_address: clientIp, success: false, attempt_type: 'validate_otp', correlation_id: correlationId });
      await checkAndRaiseAlert(supabaseAdmin, email.toLowerCase(), clientIp, correlationId);
      const message = attemptsRemaining <= 0 ? "Too many failed attempts. Please request a new code." : "Invalid code";
      return new Response(JSON.stringify({ success: false, message, attempts_remaining: Math.max(attemptsRemaining, 0) }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await supabaseAdmin.from('password_reset_tokens').update({ is_used: true, used_at: new Date().toISOString(), validated_by: 'otp' }).eq('id', token.id);
    await supabaseAdmin.from('password_reset_attempts').insert({ email: email.toLowerCase(), ip_address: clientIp, success: true, attempt_type: 'validate_otp', correlation_id: correlationId });

    return new Response(JSON.stringify({ success: true, reset_token: token.magic_token, user_id: token.user_id }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("[PasswordReset][validate_otp] Error:", error);
    const h = getAuthCorsHeaders(req);
    if (error.name === 'ZodError') return new Response(JSON.stringify({ error: "Invalid request format" }), { status: 400, headers: { ...h, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ error: "An error occurred during validation" }), { status: 500, headers: { ...h, "Content-Type": "application/json" } });
  }
});
