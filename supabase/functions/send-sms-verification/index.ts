import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { logSecurityEvent } from "../_shared/security-logger.ts";
import { hashOTP } from "../_shared/otp-hash.ts";
import { checkIPRateLimit } from "../_shared/ip-rate-limiter.ts";
import { getCorsHeaders } from '../_shared/cors.ts';
import { sendSMS, TwilioSendError } from '../_shared/twilio-client.ts';

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const IS_DEVELOPMENT = Deno.env.get("DENO_ENV") === "development";
const DEV_FIXED_CODE = "123456";

const generateCode = () => {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const randomNum = 100000 + (array[0] % 900000);
  return randomNum.toString();
};

const requestSchema = z.object({
  phone: z.string().min(10, 'Phone number too short').max(20, 'Phone number too long'),
});

// Extended error suggestions for verification-specific UX (supplements shared TWILIO_ERROR_MAP)
const TWILIO_VERIFICATION_SUGGESTIONS: Record<number, string> = {
  21211: 'Please check the number and try again.',
  21214: 'Please use a different number.',
  21217: 'Please use a verified phone number.',
  21408: 'SMS cannot be sent to this country. Please use email verification instead.',
  21610: 'Please use email verification instead.',
  21612: 'Your carrier may be blocking messages. Try email verification instead.',
  21614: 'This may be a landline. Please use a mobile number or email verification.',
  30003: 'The carrier network is unavailable. Please try again later or use email verification.',
  30004: 'Your carrier is blocking verification SMS. Please use email verification instead.',
  30005: 'This number does not exist. Please check and try again.',
  30006: 'Please use a mobile number or try email verification.',
};

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const hasTwilioCredentials = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER;

    if (!hasTwilioCredentials && !IS_DEVELOPMENT) {
      console.error('[SECURITY] Twilio credentials missing in production environment');
      throw new Error('SMS service not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const authHeader = req.headers.get('Authorization');

    let user = null;
    if (authHeader) {
      const { data: { user: authUser } } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      user = authUser;
    }

    const body = await req.json();
    const { phone } = requestSchema.parse(body);
    const forwardedFor = req.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // IP-based rate limiting for ALL requests (authenticated or not)
    const ipRateLimit = await checkIPRateLimit(ipAddress, phone, 'phone', 3, 30 * 60 * 1000);
    if (!ipRateLimit.allowed) {
      console.log(`[SMS Verification] IP rate limit exceeded: ${ipAddress} / ${phone.substring(0, 8)}****`);

      await logSecurityEvent({
        eventType: 'verification_rate_limit_hit',
        userId: user?.id,
        ipAddress,
        userAgent,
        details: {
          verification_type: 'phone',
          phone_number: phone.substring(0, 8) + '****',
          source: 'ip_rate_limit',
        }
      });

      return new Response(
        JSON.stringify({
          error: 'Too many verification attempts. Please try again later.',
          error_code: 'RATE_LIMITED',
          retry_after_seconds: ipRateLimit.retryAfterSeconds,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(ipRateLimit.retryAfterSeconds || 1800),
          },
        }
      );
    }

    // Authenticated user rate limiting (existing RPC-based)
    if (user) {
      const { data: rateLimitCheck } = await supabase.rpc('check_verification_rate_limit', {
        _user_id: user.id,
        _verification_type: 'phone',
        _action: 'send'
      });

      if (rateLimitCheck && !rateLimitCheck.allowed) {
        console.log(`[SMS Verification] Rate limit exceeded for user ${user.id}`);

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
          }
        });

        await logSecurityEvent({
          eventType: 'verification_rate_limit_hit',
          userId: user.id,
          ipAddress,
          userAgent,
          details: {
            verification_type: 'phone',
            attempts: rateLimitCheck.attempts,
            phone_number: phone.substring(0, 8) + '****',
          }
        });

        return new Response(
          JSON.stringify({
            error: rateLimitCheck.message || 'Too many attempts. Please try again later.',
            error_code: 'RATE_LIMITED',
            retry_after_minutes: rateLimitCheck.retry_after_minutes,
            retry_after_seconds: rateLimitCheck.retry_after_seconds,
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Retry-After': String(rateLimitCheck.retry_after_seconds || 1800),
            },
          }
        );
      }
    }

    // IDEMPOTENCY CHECK
    const { data: recentCode } = await supabase
      .from('phone_verifications')
      .select('id, created_at')
      .eq('phone', phone)
      .is('verified_at', null)
      .gt('expires_at', new Date().toISOString())
      .gt('created_at', new Date(Date.now() - 60000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (recentCode) {
      console.log(`[SMS Verification] Idempotency: Recent code exists for ${phone.substring(0, 8)}****`);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Verification code already sent',
          code_length: 6,
          expires_in_minutes: 30,
          idempotent: true,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Generate code and hash it
    const code = (IS_DEVELOPMENT && !TWILIO_ACCOUNT_SID) ? DEV_FIXED_CODE : generateCode();
    const codeHash = await hashOTP(code);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // Store hashed code only — plaintext is REDACTED for security
    const { error: dbError } = await supabase
      .from('phone_verifications')
      .insert({
        user_id: user?.id || null,
        phone,
        code: 'REDACTED',
        code_hash: codeHash,
        expires_at: expiresAt.toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent,
      });

    if (dbError) throw dbError;

    // DEV MODE BYPASS
    if (IS_DEVELOPMENT && !TWILIO_ACCOUNT_SID) {
      console.log(`[DEV MODE] SMS Code for ${phone}: ${code}`);

      if (user) {
        await supabase.from('verification_attempts').insert({
          user_id: user.id,
          verification_type: 'phone',
          action: 'send',
          success: true,
          phone,
          ip_address: ipAddress,
          user_agent: userAgent,
          metadata: { dev_mode: true },
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Verification code sent (dev mode)',
          code_length: 6,
          expires_in_minutes: 30,
          dev_mode: true,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // PRODUCTION: Send via Twilio
    console.log(`[SMS Verification] Sending SMS to ${phone.substring(0, 8)}****`);

    // Build callback URL for delivery tracking
    const callbackUrl = `${SUPABASE_URL}/functions/v1/twilio-status-callback`;

    let twilioResult: { sid: string; status: string };
    try {
      twilioResult = await sendSMS({
        to: phone,
        body: `Your Quantum Club verification code is: ${code}\n\nThis code expires in 30 minutes.\n\nIf you didn't request this, please ignore.`,
        statusCallback: callbackUrl,
      });
    } catch (smsError) {
      if (smsError instanceof TwilioSendError) {
        console.error('[SMS Verification] Twilio API error:', {
          status: smsError.httpStatus,
          error_code: smsError.twilioCode,
          error: smsError.message,
          phone: phone.substring(0, 8) + '****',
        });

        // Store Twilio error in the verification record
        await supabase
          .from('phone_verifications')
          .update({
            twilio_status: 'failed',
            twilio_error_code: String(smsError.twilioCode || 'unknown'),
          })
          .eq('phone', phone)
          .eq('code_hash', codeHash);

        // Map Twilio error to user-friendly message with verification-specific suggestions
        const suggestion = smsError.twilioCode
          ? TWILIO_VERIFICATION_SUGGESTIONS[smsError.twilioCode]
          : undefined;
        const userMessage = suggestion
          ? `${smsError.message} ${suggestion}`
          : 'SMS service temporarily unavailable. Please try email verification instead.';

        return new Response(
          JSON.stringify({
            error: userMessage,
            error_code: 'SMS_DELIVERY_FAILED',
            twilio_error_code: smsError.twilioCode,
            suggestion: suggestion || 'Try email verification instead.',
          }),
          {
            status: 422,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
      throw smsError;
    }

    // Store Twilio SID and status for delivery tracking
    await supabase
      .from('phone_verifications')
      .update({
        twilio_sid: twilioResult.sid,
        twilio_status: twilioResult.status,
      })
      .eq('phone', phone)
      .eq('code_hash', codeHash);

    console.log('[SMS Verification] SMS sent successfully:', {
      sid: twilioResult.sid,
      status: twilioResult.status,
      to: phone.substring(0, 8) + '****',
    });

    if (user) {
      await supabase.from('verification_attempts').insert({
        user_id: user.id,
        verification_type: 'phone',
        action: 'send',
        success: true,
        phone,
        ip_address: ipAddress,
        user_agent: userAgent,
      });
    }

    await logSecurityEvent({
      eventType: 'sms_verification_sent',
      details: { phone, authenticated: !!user, twilio_sid: twilioResult.sid },
      ipAddress,
      userAgent,
      userId: user?.id,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Verification code sent',
        code_length: 6,
        expires_in_minutes: 30,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('[SMS Verification] Error:', error);

    let errorMessage = 'Failed to send verification code';
    let errorCode = 'UNKNOWN_ERROR';
    let suggestion = 'Please try again or use email verification.';

    if (error.message?.includes('Twilio')) {
      errorMessage = 'SMS service temporarily unavailable.';
      errorCode = 'TWILIO_ERROR';
      suggestion = 'Please try email verification instead.';
    } else if (error.message?.includes('rate limit')) {
      errorMessage = error.message;
      errorCode = 'RATE_LIMITED';
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        error_code: errorCode,
        suggestion,
        details: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
