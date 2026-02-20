import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-application-name",
};

const requestSchema = z.object({
  token: z.string(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const { token } = requestSchema.parse(body);
    const clientIp = req.headers.get("x-forwarded-for") || "unknown";

    // Look up token
    const { data: tokens, error: lookupError } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('*')
      .eq('magic_token', token)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .limit(1);

    if (lookupError) {
      console.error('[PasswordReset][validate_token] Lookup error:', lookupError);
      throw lookupError;
    }

    const resetToken = tokens?.[0];
    const correlationId = resetToken?.correlation_id || null;

    console.log(`[PasswordReset][${correlationId}][validate_token] Validating magic link token`);

    if (!resetToken) {
      console.log(`[PasswordReset][${correlationId}][validate_token] No valid token found`);

      await supabaseAdmin.from('password_reset_attempts').insert({
        email: 'unknown',
        ip_address: clientIp,
        success: false,
        attempt_type: 'validate_token',
        correlation_id: correlationId,
      });

      return new Response(
        JSON.stringify({ valid: false, message: "Invalid or expired token" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark token as used with validated_by = 'magic_link'
    await supabaseAdmin
      .from('password_reset_tokens')
      .update({ is_used: true, used_at: new Date().toISOString(), validated_by: 'magic_link' })
      .eq('id', resetToken.id);

    // Log successful attempt
    await supabaseAdmin.from('password_reset_attempts').insert({
      email: resetToken.email,
      ip_address: clientIp,
      success: true,
      attempt_type: 'validate_token',
      correlation_id: correlationId,
    });

    console.log(`[PasswordReset][${correlationId}][validate_token] Token validated successfully`);

    return new Response(
      JSON.stringify({ valid: true, user_id: resetToken.user_id, email: resetToken.email }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[PasswordReset][validate_token] Error:", error);
    
    if (error.name === 'ZodError') {
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid request format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ valid: false, error: "An error occurred during validation" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
