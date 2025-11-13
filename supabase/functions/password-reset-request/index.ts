import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const requestSchema = z.object({
  email: z.string().email(),
});

// Generate 64-character hex token
function generateSecureToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Generate 6-digit OTP
function generateOTP(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const num = (array[0] % 900000) + 100000;
  return num.toString();
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
    const { email } = requestSchema.parse(body);

    const clientIp = req.headers.get("x-forwarded-for") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    console.log(`[Password Reset Request] Email: ${email}, IP: ${clientIp}`);

    // Check rate limit
    const { data: rateLimitData } = await supabaseAdmin.rpc(
      'check_password_reset_rate_limit',
      { p_email: email.toLowerCase(), p_ip_address: clientIp }
    );

    if (rateLimitData && !rateLimitData.allowed) {
      console.log(`[Password Reset] Rate limit exceeded for ${email}`);
      
      // Log attempt
      await supabaseAdmin.from('password_reset_attempts').insert({
        email: email.toLowerCase(),
        ip_address: clientIp,
        success: false,
        attempt_type: 'request'
      });

      return new Response(
        JSON.stringify({ 
          rate_limited: true,
          message: rateLimitData.message 
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Look up user by email
    const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error('[Password Reset] Error listing users:', userError);
      throw userError;
    }

    const user = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (user) {
      // Generate tokens
      const magicToken = generateSecureToken();
      const otpCode = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store reset token
      const { error: insertError } = await supabaseAdmin
        .from('password_reset_tokens')
        .insert({
          user_id: user.id,
          email: email.toLowerCase(),
          magic_token: magicToken,
          otp_code: otpCode,
          expires_at: expiresAt.toISOString(),
          ip_address: clientIp,
          user_agent: userAgent,
        });

      if (insertError) {
        console.error('[Password Reset] Error inserting token:', insertError);
        throw insertError;
      }

      // Send hybrid email (magic link + OTP)
      const appUrl = Deno.env.get("APP_URL") || "https://thequantumclub.app";
      const magicLink = `${appUrl}/reset-password/verify-token?token=${magicToken}`;
      
      const { error: emailError } = await supabaseAdmin.functions.invoke(
        'send-password-reset-email',
        {
          body: {
            email: user.email,
            userName: user.user_metadata?.full_name || user.email?.split('@')[0],
            otpCode,
            magicLink,
            expiresInMinutes: 10,
            ipAddress: clientIp,
            deviceInfo: userAgent,
          }
        }
      );

      if (emailError) {
        console.error('[Password Reset] Error sending email:', emailError);
        // Don't throw - still return success to prevent email enumeration
      }

      console.log(`[Password Reset] Token generated for ${email}`);
    } else {
      console.log(`[Password Reset] No user found for ${email} (but returning success)`);
    }

    // Log attempt
    await supabaseAdmin.from('password_reset_attempts').insert({
      email: email.toLowerCase(),
      ip_address: clientIp,
      success: true,
      attempt_type: 'request'
    });

    // Always return success to prevent email enumeration
    return new Response(
      JSON.stringify({
        success: true,
        message: "If an account exists, you will receive reset instructions"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[Password Reset Request] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: "An error occurred while processing your request" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
