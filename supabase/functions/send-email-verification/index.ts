import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { CodeBox, Heading, Paragraph, Spacer, Card } from "../_shared/email-templates/components.ts";
import { logSecurityEvent } from "../_shared/security-logger.ts";
import { EMAIL_SENDERS } from "../_shared/email-config.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-api-version, x-application-name, traceparent, tracestate",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

// Cryptographically secure OTP generation
const generateCode = () => {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const randomNum = 100000 + (array[0] % 900000);
  return randomNum.toString();
};

// Input validation schema
const requestSchema = z.object({
  email: z.string().email('Invalid email format').max(255, 'Email too long'),
});

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const authHeader = req.headers.get('Authorization');
    
    // Support both authenticated and unauthenticated (public) requests
    let user = null;
    if (authHeader) {
      const { data: { user: authUser } } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      user = authUser;
    }

    // Validate input
    const body = await req.json();
    const { email } = requestSchema.parse(body);
    // Extract first IP from x-forwarded-for header (may contain multiple IPs)
    const forwardedFor = req.headers.get('x-forwarded-for') || 'unknown';
    const ipAddress = forwardedFor.split(',')[0].trim();
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Check rate limiting only for authenticated users
    if (user) {
      const { data: rateLimitCheck } = await supabase.rpc('check_verification_rate_limit', {
        _user_id: user.id,
        _verification_type: 'email',
        _action: 'send'
      });

      if (rateLimitCheck && !rateLimitCheck.allowed) {
        console.log(`[Email Verification] Rate limit exceeded for user ${user.id}:`, {
          attempts: rateLimitCheck.attempts,
          max_attempts: rateLimitCheck.max_attempts,
          retry_after_minutes: rateLimitCheck.retry_after_minutes
        });

        await supabase.from('verification_attempts').insert({
          user_id: user.id,
          verification_type: 'email',
          action: 'send',
          success: false,
          email,
          error_message: rateLimitCheck.message,
          ip_address: ipAddress,
          user_agent: userAgent,
          metadata: {
            rate_limited: true,
            attempts: rateLimitCheck.attempts,
            max_attempts: rateLimitCheck.max_attempts,
            retry_after_minutes: rateLimitCheck.retry_after_minutes
          }
        });

        // Return detailed error with retry information
        return new Response(
          JSON.stringify({
            error: rateLimitCheck.message || 'Too many attempts. Please try again later.',
            error_code: 'RATE_LIMITED',
            retry_after_minutes: rateLimitCheck.retry_after_minutes,
            retry_after_seconds: rateLimitCheck.retry_after_seconds
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
              'Retry-After': String(rateLimitCheck.retry_after_seconds || 1800)
            }
          }
        );
      }
    }

    // IDEMPOTENCY CHECK: Check if a code was sent to this email recently (within 60 seconds)
    // Return success without generating a new code to prevent duplicate emails
    const { data: recentCode } = await supabase
      .from('email_verifications')
      .select('id, code, created_at')
      .eq('email', email)
      .is('verified_at', null)
      .gt('expires_at', new Date().toISOString())
      .gt('created_at', new Date(Date.now() - 60000).toISOString()) // Within last 60 seconds
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (recentCode) {
      console.log(`[Email Verification] Idempotency: Recent code exists for ${email}, returning success without new email`);
      
      // Return success without sending a new email - this handles rapid clicks
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Verification code already sent',
          idempotent: true
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Generate new code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Store verification in database
    const { error: dbError } = await supabase
      .from('email_verifications')
      .insert({
        user_id: user?.id || null,
        email,
        code,
        expires_at: expiresAt.toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent
      });

    if (dbError) throw dbError;

    // Send email with new template
    const emailContent = `
      ${Heading({ text: 'Verify Your Email Address', level: 1 })}
      ${Spacer(24)}
      ${Paragraph('Welcome to The Quantum Club. To complete your profile setup, please enter this verification code:', 'secondary')}
      ${Spacer(32)}
      ${CodeBox({ code, label: 'Your Verification Code' })}
      ${Spacer(32)}
      ${Card({
        variant: 'default',
        content: `
          ${Paragraph('<strong>⏱️ Security Notice:</strong>', 'secondary')}
          ${Paragraph('This code expires in 30 minutes', 'muted')}
          ${Spacer(16)}
          ${Paragraph('Never share this code with anyone. Our team will never ask for it.', 'muted')}
        `
      })}
      ${Spacer(24)}
      ${Paragraph('If you didn\'t request this code, you can safely ignore this email.', 'muted')}
    `;

    const html = baseEmailTemplate({
      preheader: `Your verification code: ${code}`,
      content: emailContent,
      showHeader: true,
      showFooter: true,
    });

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_SENDERS.verification,
        to: [email],
        subject: "Verify Your Email - The Quantum Club",
        html,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(`Resend API error: ${errorText}`);
    }

    // Log successful attempt (only for authenticated users)
    if (user) {
      await supabase.from('verification_attempts').insert({
        user_id: user.id,
        verification_type: 'email',
        action: 'send',
        success: true,
        email,
        ip_address: ipAddress,
        user_agent: userAgent
      });
    }

    // Security logging
    await logSecurityEvent({
      eventType: 'email_verification_sent',
      details: { email, authenticated: !!user },
      ipAddress,
      userAgent,
      userId: user?.id,
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
