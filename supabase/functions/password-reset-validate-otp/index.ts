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

    console.log(`[OTP Validation] Validating OTP for email`);

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
      console.error('[OTP Validation] Lookup error:', lookupError);
      throw lookupError;
    }

    if (!tokens || tokens.length === 0) {
      console.log('[OTP Validation] No active token found');

      // FIX BUG G: Log validate_otp attempt
      await supabaseAdmin.from('password_reset_attempts').insert({
        email: email.toLowerCase(),
        ip_address: clientIp,
        success: false,
        attempt_type: 'validate_otp'
      });

      return new Response(
        JSON.stringify({
          success: false,
          message: "Invalid or expired code"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = tokens[0];

    // Check attempts BEFORE incrementing (already at max)
    if (token.attempts >= MAX_ATTEMPTS) {
      console.log('[OTP Validation] Max attempts already reached');

      await supabaseAdmin.from('password_reset_attempts').insert({
        email: email.toLowerCase(),
        ip_address: clientIp,
        success: false,
        attempt_type: 'validate_otp'
      });

      return new Response(
        JSON.stringify({
          success: false,
          message: "Too many failed attempts. Please request a new code.",
          attempts_remaining: 0
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Always increment attempts counter FIRST
    const { error: incrementError } = await supabaseAdmin
      .from('password_reset_tokens')
      .update({ attempts: token.attempts + 1 })
      .eq('id', token.id);

    if (incrementError) {
      console.error('[OTP Validation] Failed to increment attempts:', incrementError);
    }

    const currentAttempts = token.attempts + 1;
    const attemptsRemaining = MAX_ATTEMPTS - currentAttempts;

    // FIX BUG C: Compare using bcrypt instead of plaintext
    const otpMatches = await compare(otp_code, token.otp_code);

    if (!otpMatches) {
      console.log(`[OTP Validation] Invalid OTP, ${attemptsRemaining} attempts remaining`);

      await supabaseAdmin.from('password_reset_attempts').insert({
        email: email.toLowerCase(),
        ip_address: clientIp,
        success: false,
        attempt_type: 'validate_otp'
      });

      if (attemptsRemaining <= 0) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Too many failed attempts. Please request a new code.",
            attempts_remaining: 0
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          message: "Invalid code",
          attempts_remaining: attemptsRemaining
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // FIX BUG A: Valid OTP - mark as used AND set validated_by = 'otp'
    const { error: updateError } = await supabaseAdmin
      .from('password_reset_tokens')
      .update({
        is_used: true,
        used_at: new Date().toISOString(),
        validated_by: 'otp'
      })
      .eq('id', token.id);

    if (updateError) {
      console.error('[OTP Validation] Update error:', updateError);
      throw updateError;
    }

    // FIX BUG G: Log successful validate_otp attempt
    await supabaseAdmin.from('password_reset_attempts').insert({
      email: email.toLowerCase(),
      ip_address: clientIp,
      success: true,
      attempt_type: 'validate_otp'
    });

    console.log(`[OTP Validation] OTP verified successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        reset_token: token.magic_token,
        user_id: token.user_id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[OTP Validation] Error:", error);
    
    if (error.name === 'ZodError') {
      return new Response(
        JSON.stringify({ error: "Invalid request format" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "An error occurred during validation" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
