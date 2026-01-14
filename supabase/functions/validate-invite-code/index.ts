import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { checkUserRateLimit, createRateLimitResponse } from '../_shared/rate-limiter.ts';
import { logSecurityEvent } from '../_shared/security-logger.ts';
import { publicCorsHeaders as corsHeaders } from "../_shared/cors-config.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting (10 validation attempts per hour per IP)
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    const rateLimit = await checkUserRateLimit(
      clientIP,
      'validate-invite-code',
      10,
      3600000 // 1 hour
    );

    if (!rateLimit.allowed) {
      await logSecurityEvent({
        eventType: 'invite_code_rate_limit',
        details: { 
          ip: clientIP,
          attempts: rateLimit.limit
        },
        ipAddress: clientIP,
        userAgent: req.headers.get('user-agent') || undefined
      });
      return createRateLimitResponse(rateLimit.retryAfter || 3600, corsHeaders);
    }

    const { code } = await req.json();
    
    if (!code || typeof code !== 'string') {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          reason: 'invalid_request',
          message: 'Invite code is required' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check if code exists
    const { data: codeData, error } = await supabase
      .from('invite_codes')
      .select('code, is_active, expires_at, used_by, used_at, created_by')
      .eq('code', code.toUpperCase())
      .single();
    
    let referrerName = 'a member';
    if (codeData?.created_by) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', codeData.created_by)
        .single();
      referrerName = profile?.full_name || 'a member';
    }

    if (error || !codeData) {
      // Log failed validation attempt
      await logSecurityEvent({
        eventType: 'invite_code_validation_failed',
        details: { 
          code: code.substring(0, 3) + '***', // Partial code for security
          reason: 'not_found'
        },
        ipAddress: clientIP,
        userAgent: req.headers.get('user-agent') || undefined
      });
      
      return new Response(
        JSON.stringify({ 
          valid: false, 
          reason: 'not_found',
          message: 'Invite code not found. Double-check the code or request a new one.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already used
    if (codeData.used_by) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          reason: 'already_used',
          message: `This invite code was already used on ${new Date(codeData.used_at).toLocaleDateString()}.`,
          usedAt: codeData.used_at
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if expired
    if (new Date(codeData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          reason: 'expired',
          message: 'This invite code has expired. Request a new one.',
          expiredAt: codeData.expires_at
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if inactive
    if (!codeData.is_active) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          reason: 'inactive',
          message: 'This invite code is no longer active.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Valid code
    return new Response(
      JSON.stringify({ 
        valid: true,
        message: 'Valid invite code! Please create your account.',
        referrerName
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Validation error:', error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        reason: 'error',
        message: 'Error validating invite code. Please try again.' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
