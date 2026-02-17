import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { compare } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-application-name",
};

const MAX_ATTEMPTS = 5;

const requestSchema = z.object({
  email: z.string().email(),
  otp_code: z.string().length(6),
});

// Check if security alert should be raised
async function checkAndRaiseAlert(supabaseAdmin: any, email: string, clientIp: string, correlationId: string | null) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count } = await supabaseAdmin
    .from('password_reset_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('email', email)
    .eq('success', false)
    .in('attempt_type', ['validate_otp', 'validate_token', 'set_password'])
    .gte('attempted_at', oneHourAgo);

  if (count && count >= 3) {
    console.log(`[PasswordReset][${correlationId}][SECURITY_ALERT] ${count} failed attempts for email in last hour`);
    await supabaseAdmin.from('security_alerts').insert({
      alert_type: 'password_reset_brute_force',
      email,
      ip_address: clientIp,
      details: { failed_attempts: count, correlation_id: correlationId, stage: 'validate_otp' },
    });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const { email, otp_code } = requestSchema.parse(body);
    const clientIp = req.headers.get("x-forwarded-for") || "unknown";

    // Look up the latest active token for this email
    const { data: tokens, error: lookupError } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (lookupError) {
      console.error('[PasswordReset][validate_otp] Lookup error:', lookupError);
      throw lookupError;
    }

    const token = tokens?.[0];
    const correlationId = token?.correlation_id || null;

    console.log(`[PasswordReset][${correlationId}][validate_otp] Validating OTP for email`);

    if (!token) {
      console.log(`[PasswordReset][${correlationId}][validate_otp] No active token found`);

      await supabaseAdmin.from('password_reset_attempts').insert({
        email: email.toLowerCase(),
        ip_address: clientIp,
        success: false,
        attempt_type: 'validate_otp',
        correlation_id: correlationId,
      });

      return new Response(
        JSON.stringify({ success: false, message: "Invalid or expired code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check attempts BEFORE incrementing
    if (token.attempts >= MAX_ATTEMPTS) {
      console.log(`[PasswordReset][${correlationId}][validate_otp] Max attempts reached`);

      await supabaseAdmin.from('password_reset_attempts').insert({
        email: email.toLowerCase(),
        ip_address: clientIp,
        success: false,
        attempt_type: 'validate_otp',
        correlation_id: correlationId,
      });

      await checkAndRaiseAlert(supabaseAdmin, email.toLowerCase(), clientIp, correlationId);

      return new Response(
        JSON.stringify({ success: false, message: "Too many failed attempts. Please request a new code.", attempts_remaining: 0 }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Always increment attempts counter FIRST
    await supabaseAdmin
      .from('password_reset_tokens')
      .update({ attempts: token.attempts + 1 })
      .eq('id', token.id);

    const currentAttempts = token.attempts + 1;
    const attemptsRemaining = MAX_ATTEMPTS - currentAttempts;

    // Compare using bcrypt
    const otpMatches = await compare(otp_code, token.otp_code);

    if (!otpMatches) {
      console.log(`[PasswordReset][${correlationId}][validate_otp] Invalid OTP, ${attemptsRemaining} remaining`);

      await supabaseAdmin.from('password_reset_attempts').insert({
        email: email.toLowerCase(),
        ip_address: clientIp,
        success: false,
        attempt_type: 'validate_otp',
        correlation_id: correlationId,
      });

      await checkAndRaiseAlert(supabaseAdmin, email.toLowerCase(), clientIp, correlationId);

      const message = attemptsRemaining <= 0
        ? "Too many failed attempts. Please request a new code."
        : "Invalid code";

      return new Response(
        JSON.stringify({ success: false, message, attempts_remaining: Math.max(attemptsRemaining, 0) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Valid OTP — mark as used with validated_by = 'otp'
    await supabaseAdmin
      .from('password_reset_tokens')
      .update({ is_used: true, used_at: new Date().toISOString(), validated_by: 'otp' })
      .eq('id', token.id);

    // Log successful attempt
    await supabaseAdmin.from('password_reset_attempts').insert({
      email: email.toLowerCase(),
      ip_address: clientIp,
      success: true,
      attempt_type: 'validate_otp',
      correlation_id: correlationId,
    });

    console.log(`[PasswordReset][${correlationId}][validate_otp] OTP verified successfully`);

    return new Response(
      JSON.stringify({ success: true, reset_token: token.magic_token, user_id: token.user_id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[PasswordReset][validate_otp] Error:", error);
    
    if (error.name === 'ZodError') {
      return new Response(
        JSON.stringify({ error: "Invalid request format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "An error occurred during validation" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
