import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { email } = await req.json();
    // Extract first IP from x-forwarded-for header (may contain multiple IPs)
    const forwardedFor = req.headers.get('x-forwarded-for') || 'unknown';
    const ipAddress = forwardedFor.split(',')[0].trim();
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Check rate limiting
    const { data: rateLimitCheck } = await supabase.rpc('check_verification_rate_limit', {
      _user_id: user.id,
      _verification_type: 'email',
      _action: 'send'
    });

    if (rateLimitCheck && !rateLimitCheck.allowed) {
      await supabase.from('verification_attempts').insert({
        user_id: user.id,
        verification_type: 'email',
        action: 'send',
        success: false,
        email,
        error_message: rateLimitCheck.message,
        ip_address: ipAddress,
        user_agent: userAgent
      });

      return new Response(
        JSON.stringify({ error: rateLimitCheck.message }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate new code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Store verification in database
    const { error: dbError } = await supabase
      .from('email_verifications')
      .insert({
        user_id: user.id,
        email,
        code,
        expires_at: expiresAt.toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent
      });

    if (dbError) throw dbError;

    // Send email with branded template
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "The Quantum Club <verify@thequantumclub.nl>",
        to: [email],
        subject: "Verify Your Email - The Quantum Club",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: linear-gradient(135deg, #0E0E10 0%, #1a1a1f 100%); margin: 0; padding: 40px 20px; }
              .container { max-width: 600px; margin: 0 auto; background: rgba(255, 255, 255, 0.02); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; padding: 48px 40px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5); }
              .logo { text-align: center; margin-bottom: 40px; }
              .logo-text { font-size: 28px; font-weight: 700; background: linear-gradient(135deg, #C9A24E 0%, #F5F4EF 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: -0.5px; }
              h1 { color: #F5F4EF; font-size: 24px; font-weight: 600; margin: 0 0 16px 0; text-align: center; }
              p { color: rgba(245, 244, 239, 0.8); font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; text-align: center; }
              .code-container { background: rgba(201, 162, 78, 0.1); border: 2px solid #C9A24E; border-radius: 16px; padding: 32px; margin: 32px 0; text-align: center; }
              .code { font-size: 48px; font-weight: 700; color: #C9A24E; letter-spacing: 8px; font-family: 'SF Mono', Monaco, monospace; }
              .expires { color: rgba(245, 244, 239, 0.6); font-size: 14px; margin-top: 16px; }
              .footer { margin-top: 40px; padding-top: 32px; border-top: 1px solid rgba(255, 255, 255, 0.1); text-align: center; }
              .footer p { font-size: 14px; color: rgba(245, 244, 239, 0.5); margin-bottom: 8px; }
              .button { display: inline-block; background: linear-gradient(135deg, #C9A24E 0%, #b8944a 100%); color: #0E0E10; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; margin: 24px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="logo">
                <div class="logo-text">✦ THE QUANTUM CLUB</div>
              </div>
              <h1>Verify Your Email Address</h1>
              <p>Welcome to The Quantum Club. To complete your profile setup, please enter this verification code:</p>
              
              <div class="code-container">
                <div class="code">${code}</div>
                <p class="expires">This code expires in 30 minutes</p>
              </div>
              
              <p>If you didn't request this code, you can safely ignore this email.</p>
              
              <div class="footer">
                <p>The Quantum Club - Exclusive Talent Network</p>
                <p>Need help? Contact support@thequantumclub.nl</p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(`Resend API error: ${errorText}`);
    }

    // Log successful attempt
    await supabase.from('verification_attempts').insert({
      user_id: user.id,
      verification_type: 'email',
      action: 'send',
      success: true,
      email,
      ip_address: ipAddress,
      user_agent: userAgent
    });

    const result = await emailResponse.json();
    console.log("Verification email sent successfully:", result);

    return new Response(
      JSON.stringify({ success: true, message: 'Verification code sent' }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending verification email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
