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
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      throw new Error('Twilio credentials not configured');
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
        await supabase.from('verification_attempts').insert({
          user_id: user.id,
          verification_type: 'phone',
          action: 'send',
          success: false,
          phone,
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

    // Generate new code
    const code = generateCode();
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

    // Send SMS via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const twilioAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const formData = new URLSearchParams();
    formData.append('To', phone);
    formData.append('From', TWILIO_PHONE_NUMBER);
    formData.append('Body', `Your Quantum Club verification code is: ${code}\n\nThis code expires in 30 minutes.\n\nIf you didn't request this, please ignore.`);

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!twilioResponse.ok) {
      const errorText = await twilioResponse.text();
      throw new Error(`Twilio API error: ${errorText}`);
    }

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

    const result = await twilioResponse.json();
    console.log("SMS sent successfully:", result.sid);

    return new Response(
      JSON.stringify({ success: true, message: 'Verification code sent' }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending SMS:", error);
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
