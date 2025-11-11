import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
