import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { hash as bcryptHash } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-application-name",
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

    console.log(`[Password Reset] Request received for email`);

    // Check rate limit
    const { data: rateLimitData } = await supabaseAdmin.rpc(
      'check_password_reset_rate_limit',
      { p_email: email.toLowerCase(), p_ip_address: clientIp }
    );

    if (rateLimitData && !rateLimitData.allowed) {
      console.log(`[Password Reset] Rate limit exceeded`);
      
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

    // FIX BUG B: Profile table is the source of truth. No auth fallback.
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (profileError) {
      console.error('[Password Reset] Profile lookup error:', profileError);
    }

    let userId: string | null = null;
    let userName: string | null = null;
    let userEmail: string | null = null;

    if (profile) {
      userId = profile.id;
      userName = profile.full_name;
      userEmail = profile.email || email;
    }
    // No fallback - if no profile, silently return success (anti-enumeration)

    console.log(`[Password Reset] User lookup: ${userId ? 'found' : 'not found'}`);

    if (userId && userEmail) {
      // FIX BUG A: Mark old tokens as 'invalidated' instead of just is_used=true
      await supabaseAdmin
        .from('password_reset_tokens')
        .update({ 
          is_used: true, 
          used_at: new Date().toISOString(),
          validated_by: 'invalidated'
        })
        .eq('email', email.toLowerCase())
        .eq('is_used', false);

      // Generate tokens
      const magicToken = generateSecureToken();
      const otpCode = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // FIX BUG C: Hash the OTP before storing
      const otpHash = await bcryptHash(otpCode);

      console.log(`[Password Reset] Token generated, expires at ${expiresAt.toISOString()}`);

      // Store reset token with hashed OTP
      const { error: insertError } = await supabaseAdmin
        .from('password_reset_tokens')
        .insert({
          user_id: userId,
          email: email.toLowerCase(),
          magic_token: magicToken,
          otp_code: otpHash,
          expires_at: expiresAt.toISOString(),
          ip_address: clientIp,
          user_agent: userAgent,
        });

      if (insertError) {
        console.error('[Password Reset] Token insert error:', insertError);
        throw insertError;
      }

      // Send hybrid email (magic link + OTP) with retry logic
      const appUrl = Deno.env.get("APP_URL") || "https://thequantumclub.lovable.app";
      const magicLink = `${appUrl}/reset-password/verify-token?token=${magicToken}`;
      
      const MAX_RETRIES = 3;
      let emailError = null;
      let emailSent = false;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const { error } = await supabaseAdmin.functions.invoke(
          'send-password-reset-email',
          {
            body: {
              email: userEmail,
              userName: userName || userEmail.split('@')[0],
              otpCode, // Send plaintext OTP to email (not the hash)
              magicLink,
              expiresInMinutes: 10,
              ipAddress: clientIp,
              deviceInfo: userAgent,
            }
          }
        );

        if (!error) {
          console.log(`[Password Reset] Email sent on attempt ${attempt}`);
          emailSent = true;
          break;
        }

        emailError = error;
        console.error(`[Password Reset] Email attempt ${attempt} failed`);

        if (attempt < MAX_RETRIES) {
          const waitTime = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }

      if (!emailSent) {
        console.error('[Password Reset] All email attempts failed');
      }

      console.log(`[Password Reset] Process completed - Email sent: ${emailSent}`);
    } else {
      console.log(`[Password Reset] No user found (returning success for security)`);
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
