import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-api-version, x-application-name, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, traceparent, tracestate",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

// Input validation schema
const requestSchema = z.object({
  code: z.string().length(6, 'Invalid verification code').regex(/^[0-9]{6}$/, 'Verification code must be 6 digits'),
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

    // Parse and validate request body
    const rawBody = await req.json();
    const validationResult = requestSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid verification code or email format' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { code, email } = validationResult.data;
    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Check rate limiting only for authenticated users
    if (user) {
      const { data: rateLimitCheck } = await supabase.rpc('check_verification_rate_limit', {
        _user_id: user.id,
        _verification_type: 'email',
        _action: 'verify'
      });

      if (rateLimitCheck && !rateLimitCheck.allowed) {
        await supabase.from('verification_attempts').insert({
          user_id: user.id,
          verification_type: 'email',
          action: 'verify',
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
    }

    // Find valid verification code
    let verification;
    let verifyError;
    
    if (user) {
      // For authenticated users, match by user_id
      const result = await supabase
        .from('email_verifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('email', email)
        .eq('code', code)
        .is('verified_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      verification = result.data;
      verifyError = result.error;
    } else {
      // For unauthenticated users (public/partner funnel), match by email only
      const result = await supabase
        .from('email_verifications')
        .select('*')
        .eq('email', email)
        .eq('code', code)
        .is('verified_at', null)
        .is('user_id', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      verification = result.data;
      verifyError = result.error;
    }

    if (verifyError || !verification) {
      // Log failed attempt (only for authenticated users)
      if (user) {
        await supabase.from('verification_attempts').insert({
          user_id: user.id,
          verification_type: 'email',
          action: 'verify',
          success: false,
          email,
          error_message: 'Invalid or expired code',
          ip_address: ipAddress,
          user_agent: userAgent
        });
      }

      return new Response(
        JSON.stringify({ error: 'Invalid or expired verification code' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark as verified
    await supabase
      .from('email_verifications')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', verification.id);

    // Update profile only for authenticated users
    if (user) {
      await supabase
        .from('profiles')
        .update({ 
          email: email,
          email_verified: true 
        })
        .eq('id', user.id);
    }

    // Log successful attempt (only for authenticated users)
    if (user) {
      await supabase.from('verification_attempts').insert({
        user_id: user.id,
        verification_type: 'email',
        action: 'verify',
        success: true,
        email,
        ip_address: ipAddress,
        user_agent: userAgent
      });
    }

    console.log("Email verified successfully:", user ? `user: ${user.id}` : `email: ${email}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Email verified successfully' }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error verifying email:", error);
    return new Response(
      JSON.stringify({ error: 'Unable to verify email. Please try again.' }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
