import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ip_address } = await req.json();

    if (!ip_address) {
      return new Response(
        JSON.stringify({ blocked: false, reason: 'No IP provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check if IP is blocked
    const { data: block, error } = await supabase
      .from('blocked_ips')
      .select('*')
      .eq('ip_address', ip_address)
      .eq('is_active', true)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[check-ip-blocked] Error:', error);
    }

    if (block) {
      return new Response(
        JSON.stringify({
          blocked: true,
          reason: block.reason,
          block_type: block.block_type,
          blocked_at: block.blocked_at,
          expires_at: block.expires_at
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ blocked: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[check-ip-blocked] Error:', error);
    // Fail open - don't block legitimate users on errors
    return new Response(
      JSON.stringify({ blocked: false, error: 'Check failed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
