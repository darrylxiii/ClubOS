import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { hashOTP } from "../_shared/otp-hash.ts";
import { checkIPRateLimit } from "../_shared/ip-rate-limiter.ts";
import { getCorsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const requestSchema = z.object({
  code: z.string().length(6, 'Invalid verification code').regex(/^[0-9]{6}$/, 'Verification code must be 6 digits'),
  phone: z.string().min(10, 'Invalid phone number').max(20, 'Phone number too long'),
});

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const authHeader = req.headers.get('Authorization');
    
    let user = null;
    if (authHeader) {
      const { data: { user: authUser } } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      user = authUser;
    }

    const rawBody = await req.json();
    const validationResult = requestSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid verification code or phone number format' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { code, phone } = validationResult.data;
    const forwardedFor = req.headers.get('x-forwarded-for') || 'unknown';
    const ipAddress = forwardedFor.split(',')[0].trim();
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // IP-based rate limiting for verify attempts
    const ipRateLimit = await checkIPRateLimit(ipAddress, phone, 'phone', 10, 30 * 60 * 1000);
    if (!ipRateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Too many verification attempts. Please try again later.',
          error_code: 'RATE_LIMITED',
          retry_after_seconds: ipRateLimit.retryAfterSeconds,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Authenticated user rate limiting
    if (user) {
      const { data: rateLimitCheck } = await supabase.rpc('check_verification_rate_limit', {
        _user_id: user.id,
        _verification_type: 'phone',
        _action: 'verify'
      });

      if (rateLimitCheck && !rateLimitCheck.allowed) {
        await supabase.from('verification_attempts').insert({
          user_id: user.id,
          verification_type: 'phone',
          action: 'verify',
          success: false,
          phone,
          error_message: rateLimitCheck.message,
          ip_address: ipAddress,
          user_agent: userAgent,
        });

        return new Response(
          JSON.stringify({ error: rateLimitCheck.message }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Hash the input code for comparison
    const codeHash = await hashOTP(code);

    // Try hash-based lookup first, fall back to plaintext
    let verification;
    let verifyError;

    if (user) {
      let result = await supabase
        .from('phone_verifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('phone', phone)
        .eq('code_hash', codeHash)
        .is('verified_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Fallback to plaintext for pre-migration codes
      if (!result.data) {
        result = await supabase
          .from('phone_verifications')
          .select('*')
          .eq('user_id', user.id)
          .eq('phone', phone)
          .eq('code', code)
          .is('code_hash', null)
          .is('verified_at', null)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
      }

      verification = result.data;
      verifyError = result.error;
    } else {
      let result = await supabase
        .from('phone_verifications')
        .select('*')
        .eq('phone', phone)
        .eq('code_hash', codeHash)
        .is('verified_at', null)
        .is('user_id', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Fallback to plaintext
      if (!result.data) {
        result = await supabase
          .from('phone_verifications')
          .select('*')
          .eq('phone', phone)
          .eq('code', code)
          .is('code_hash', null)
          .is('verified_at', null)
          .is('user_id', null)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
      }

      verification = result.data;
      verifyError = result.error;
    }

    if (verifyError || !verification) {
      if (user) {
        await supabase.from('verification_attempts').insert({
          user_id: user.id,
          verification_type: 'phone',
          action: 'verify',
          success: false,
          phone,
          error_message: 'Invalid or expired code',
          ip_address: ipAddress,
          user_agent: userAgent,
        });
      }

      return new Response(
        JSON.stringify({ error: 'Invalid or expired verification code' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark as verified
    await supabase
      .from('phone_verifications')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', verification.id);

    // Update profile for authenticated users
    if (user) {
      await supabase
        .from('profiles')
        .update({ phone, phone_verified: true })
        .eq('id', user.id);
    }

    if (user) {
      await supabase.from('verification_attempts').insert({
        user_id: user.id,
        verification_type: 'phone',
        action: 'verify',
        success: true,
        phone,
        ip_address: ipAddress,
        user_agent: userAgent,
      });
    }

    console.log("Phone verified successfully:", user ? `user: ${user.id}` : `phone: ${phone}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Phone verified successfully' }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error verifying phone:", error);
    return new Response(
      JSON.stringify({ error: 'Unable to verify phone number. Please try again.' }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
