import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-application-name",
};

const requestSchema = z.object({
  token: z.string(),
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
    const { token } = requestSchema.parse(body);

    console.log(`[Token Validation] Validating token`);

    // Look up token
    const { data: tokens, error: lookupError } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('*')
      .eq('magic_token', token)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .limit(1);

    if (lookupError) {
      console.error('[Token Validation] Lookup error:', lookupError);
      throw lookupError;
    }

    if (!tokens || tokens.length === 0) {
      console.log('[Token Validation] No valid token found');
      return new Response(
        JSON.stringify({
          valid: false,
          message: "Invalid or expired token"
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const resetToken = tokens[0];

    // FIX BUG 4: Mark token as used immediately to prevent replay attacks
    const { error: updateError } = await supabaseAdmin
      .from('password_reset_tokens')
      .update({
        is_used: true,
        used_at: new Date().toISOString()
      })
      .eq('id', resetToken.id);

    if (updateError) {
      console.error('[Token Validation] Failed to mark token as used:', updateError);
      throw updateError;
    }

    console.log(`[Token Validation] Token validated and marked as used`);

    return new Response(
      JSON.stringify({
        valid: true,
        user_id: resetToken.user_id,
        email: resetToken.email
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[Token Validation] Error:", error);
    
    if (error.name === 'ZodError') {
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid request format" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ valid: false, error: "An error occurred during validation" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
