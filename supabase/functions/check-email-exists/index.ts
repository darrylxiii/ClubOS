import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { checkUserRateLimit, createRateLimitResponse } from '../_shared/rate-limiter.ts';
import { logSecurityEvent } from '../_shared/security-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const requestSchema = z.object({
  email: z.string().email('Invalid email format').max(255, 'Email too long'),
});

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate input
    const body = await req.json();
    const { email } = requestSchema.parse(body);

    // Get IP address for rate limiting
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Rate limit: 5 checks per hour per IP to prevent email enumeration attacks
    const rateLimitResult = await checkUserRateLimit(
      ipAddress,
      'email-check',
      5,
      3600000 // 1 hour
    );

    if (!rateLimitResult.allowed) {
      // Log rate limit exceeded
      await logSecurityEvent({
        eventType: 'email_check_rate_limited',
        details: { email, ip: ipAddress },
        ipAddress,
        userAgent,
      });
      
      return createRateLimitResponse(rateLimitResult.retryAfter || 3600, corsHeaders);
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Check if user exists by querying profiles table
    // This is more efficient than listing all users
    const { count, error } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('email', email.toLowerCase());

    if (error) {
      console.error('Error checking email:', error);
      throw error;
    }

    // Email exists if count is greater than 0
    const emailExists = (count ?? 0) > 0;

    console.log(`Email check for ${email}: ${emailExists ? 'exists' : 'available'}`);

    // Security logging for email checks
    await logSecurityEvent({
      eventType: 'email_check_performed',
      details: { 
        email, 
        exists: emailExists,
        ip: ipAddress 
      },
      ipAddress,
      userAgent,
    });

    // Add consistent timing to prevent timing attacks
    const minResponseTime = 100; // 100ms minimum
    const elapsed = Date.now() % 200; // Random up to 200ms
    if (elapsed < minResponseTime) {
      await new Promise(resolve => setTimeout(resolve, minResponseTime - elapsed));
    }

    return new Response(
      JSON.stringify({ exists: emailExists }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in check-email-exists:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
