import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { logSecurityEvent } from "../_shared/security-logger.ts";

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Development mode - ONLY for local testing, NEVER in production
const IS_DEVELOPMENT = Deno.env.get("DENO_ENV") === "development";
const DEV_FIXED_CODE = "123456"; // Fixed code for development testing only

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  phone: z.string().min(10, 'Phone number too short').max(20, 'Phone number too long'),
});

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Security Check: In production, Twilio credentials are REQUIRED
    const hasTwilioCredentials = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER;

    if (!hasTwilioCredentials && !IS_DEVELOPMENT) {
      // Production MUST have Twilio configured - no bypass allowed
      console.error('[SECURITY] Twilio credentials missing in production environment');
      throw new Error('SMS service not configured');
    }

    if (!hasTwilioCredentials && IS_DEVELOPMENT) {
      console.warn('[DEV MODE] ⚠️  Using development bypass - Twilio credentials not configured');
      console.warn('[DEV MODE] This mode is ONLY for local testing and will NOT work in production');
    }

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
    const { phone } = requestSchema.parse(body);
    // Extract first IP from x-forwarded-for header (may contain multiple IPs)
    const forwardedFor = req.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Check rate limiting only for authenticated users
    if (user) {
      const { data: rateLimitCheck } = await supabase.rpc('check_verification_rate_limit', {
        _user_id: user.id,
        _verification_type: 'phone',
        _action: 'send'
      });

      if (rateLimitCheck && !rateLimitCheck.allowed) {
        console.log(`[SMS Verification] Rate limit exceeded for user ${user.id}:`, {
          attempts: rateLimitCheck.attempts,
          max_attempts: rateLimitCheck.max_attempts,
          retry_after_minutes: rateLimitCheck.retry_after_minutes
        });

        // Phase 2: Enhanced logging with detailed metadata
        await supabase.from('verification_attempts').insert({
          user_id: user.id,
          verification_type: 'phone',
          action: 'send',
          metadata: {
            phone,
            ip_address: ipAddress,
            user_agent: userAgent,
            rate_limited: true,
            attempts: rateLimitCheck.attempts,
            max_attempts: rateLimitCheck.max_attempts,
            retry_after_minutes: rateLimitCheck.retry_after_minutes,
            blocked_at: new Date().toISOString()
          }
        });

        // Phase 5: Security logging for repeat offenders
        await logSecurityEvent({
          eventType: 'verification_rate_limit_hit',
          userId: user.id,
          ipAddress,
          userAgent,
          details: {
            verification_type: 'phone',
            attempts: rateLimitCheck.attempts,
            retry_after_minutes: rateLimitCheck.retry_after_minutes,
            phone_number: phone.substring(0, 8) + '****' // Partial masking
          }
        });

        // Phase 2: Return detailed error message with retry info
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
              'Content-Type': 'application/json',
              'Retry-After': String(rateLimitCheck.retry_after_seconds || 1800)
            }
          }
        );
      }
    }

    // Generate verification code
    // In development without Twilio: use fixed code for easy testing
    // In production: always generate cryptographically secure random code
    const code = (IS_DEVELOPMENT && !TWILIO_ACCOUNT_SID) ? DEV_FIXED_CODE : generateCode();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Store verification in database
    const { error: dbError } = await supabase
      .from('phone_verifications')
      .insert({
        user_id: user?.id || null,
        phone,
        code,
        expires_at: expiresAt.toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent
      });

    if (dbError) throw dbError;

    // Development Mode Bypass - Skip SMS sending if in dev mode without Twilio
    if (IS_DEVELOPMENT && !TWILIO_ACCOUNT_SID) {
      console.log('═══════════════════════════════════════════════════════');
      console.log('🔧 [DEV MODE] SMS Verification Code Generated');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`📱 Phone: ${phone}`);
      console.log(`🔑 Code: ${code}`);
      console.log(`⏰ Expires: ${expiresAt.toISOString()}`);
      console.log('═══════════════════════════════════════════════════════');
      console.log('⚠️  This is DEVELOPMENT mode - no actual SMS sent');
      console.log('⚠️  Enter code "${code}" in the verification form');
      console.log('═══════════════════════════════════════════════════════');

      // Log successful attempt (only for authenticated users)
      if (user) {
        await supabase.from('verification_attempts').insert({
          user_id: user.id,
          verification_type: 'phone',
          action: 'send',
          success: true,
          phone,
          ip_address: ipAddress,
          user_agent: userAgent,
          metadata: { dev_mode: true }
        });
      }

      // Return success WITHOUT exposing the code (security best practice)
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Verification code sent (check server logs for dev code)',
          code_length: 6,
          expires_in_minutes: 30,
          dev_mode: true // Indicator this is development
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // PRODUCTION PATH - Send actual SMS via Twilio
    console.log(`[SMS Verification] Sending SMS to ${phone.substring(0, 8)}****`);

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const twilioAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const formData = new URLSearchParams();
    formData.append('To', phone);
    formData.append('From', TWILIO_PHONE_NUMBER!);
    formData.append('Body', `Your Quantum Club verification code is: ${code}\n\nThis code expires in 30 minutes.\n\nIf you didn't request this, please ignore.`);

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error('[SMS Verification] Twilio API error:', {
        status: twilioResponse.status,
        error: twilioData,
        phone: phone.substring(0, 8) + '****'
      });

      // Phase 2: Specific Twilio error handling
      const errorMessage = twilioData.message || 'Failed to send SMS';
      throw new Error(`Twilio Error: ${errorMessage}`);
    }

    console.log('[SMS Verification] SMS sent successfully:', {
      sid: twilioData.sid,
      status: twilioData.status,
      to: phone.substring(0, 8) + '****'
    });

    // Log successful attempt (only for authenticated users)
    if (user) {
      await supabase.from('verification_attempts').insert({
        user_id: user.id,
        verification_type: 'phone',
        action: 'send',
        success: true,
        phone,
        ip_address: ipAddress,
        user_agent: userAgent
      });
    }

    // Security logging
    await logSecurityEvent({
      eventType: 'sms_verification_sent',
      details: { phone, authenticated: !!user },
      ipAddress,
      userAgent,
      userId: user?.id,
    });

    // Phase 2: Enhanced success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Verification code sent',
        code_length: 6,
        expires_in_minutes: 30
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('[SMS Verification] Error:', error);

    // Phase 2: Categorize error types
    let errorMessage = 'Failed to send verification code';
    let errorCode = 'UNKNOWN_ERROR';

    if (error.message?.includes('Twilio')) {
      errorMessage = 'SMS service temporarily unavailable. Please try again.';
      errorCode = 'TWILIO_ERROR';
    } else if (error.message?.includes('rate limit')) {
      errorMessage = error.message;
      errorCode = 'RATE_LIMITED';
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        error_code: errorCode,
        details: error.message
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
