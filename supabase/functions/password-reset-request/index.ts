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

    console.log(`[Password Reset] Step 1: Initial request - Email: ${email}, IP: ${clientIp}`);

    // Check rate limit
    const { data: rateLimitData } = await supabaseAdmin.rpc(
      'check_password_reset_rate_limit',
      { p_email: email.toLowerCase(), p_ip_address: clientIp }
    );

    console.log(`[Password Reset] Step 2: Rate limit check - ${rateLimitData?.allowed ? 'PASSED' : 'BLOCKED'}`);

    if (rateLimitData && !rateLimitData.allowed) {
      console.log(`[Password Reset] Rate limit exceeded for ${email}. Reason: ${rateLimitData.reason}`);
      
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

    // Look up user by email with proper pagination handling (fixes pagination bug)
    let user = null;
    let page = 1;
    const perPage = 1000; // Max per page
    
    while (user === null) {
      const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage
      });
      
      if (userError) {
        console.error('[Password Reset] Error listing users:', userError);
        break;
      }
      
      if (!users || users.length === 0) {
        // No more users to check
        break;
      }
      
      // Find user in this page
      user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      
      if (!user && users.length < perPage) {
        // Last page, user not found
        break;
      }
      
      page++;
    }

    console.log(`[Password Reset] Step 3: User lookup - ${user ? 'FOUND' : 'NOT FOUND'} for ${email}`);

    if (user) {
      // Generate tokens
      const magicToken = generateSecureToken();
      const otpCode = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      console.log(`[Password Reset] Step 4: Token generation - Magic: ${magicToken.substring(0, 8)}..., OTP: ${otpCode}`);

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

      console.log(`[Password Reset] Step 5: Token stored in database successfully`);

      // Send hybrid email (magic link + OTP) with retry logic
      const appUrl = Deno.env.get("APP_URL") || "https://thequantumclub.app";
      const magicLink = `${appUrl}/reset-password/verify-token?token=${magicToken}`;
      
      const MAX_RETRIES = 3;
      let emailError = null;
      let emailSent = false;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        console.log(`[Password Reset] Step 6: Email send attempt ${attempt}/${MAX_RETRIES}`);
        
        const { error } = await supabaseAdmin.functions.invoke(
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

        if (!error) {
          console.log(`[Password Reset] ✅ Email sent successfully on attempt ${attempt}`);
          emailSent = true;
          break;
        }

        emailError = error;
        console.error(`[Password Reset] ❌ Email attempt ${attempt} failed:`, error);

        // Wait before retry with exponential backoff
        if (attempt < MAX_RETRIES) {
          const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.log(`[Password Reset] Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }

      if (!emailSent) {
        console.error('[Password Reset] ⚠️ All email attempts failed. Last error:', emailError);
        // Don't throw - still return success to prevent email enumeration
      }

      console.log(`[Password Reset] Step 7: Process completed for ${email} - Email sent: ${emailSent}`);
    } else {
      console.log(`[Password Reset] Step 3: No user found for ${email} (returning success for security)`);
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
