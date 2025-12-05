import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate cryptographically secure recovery codes
function generateSecureRecoveryCodes(count: number = 8): string[] {
  const codes: string[] = [];
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded I, O, 0, 1 for clarity
  
  for (let i = 0; i < count; i++) {
    const randomBytes = new Uint8Array(8);
    crypto.getRandomValues(randomBytes);
    
    let code = '';
    for (let j = 0; j < 8; j++) {
      code += charset[randomBytes[j] % charset.length];
    }
    // Format as XXXX-XXXX for readability
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  
  return codes;
}

// Hash a recovery code for storage
async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code.toUpperCase().replace(/-/g, ''));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate new recovery codes
    const plainCodes = generateSecureRecoveryCodes(8);
    
    // Hash codes for storage
    const hashedCodes = await Promise.all(
      plainCodes.map(async (code) => ({
        code_hash: await hashCode(code),
        used: false,
        created_at: new Date().toISOString()
      }))
    );

    // Store hashed codes in database using service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Delete existing recovery codes for this user
    await supabaseAdmin
      .from('user_recovery_codes')
      .delete()
      .eq('user_id', user.id);

    // Insert new hashed codes
    const { error: insertError } = await supabaseAdmin
      .from('user_recovery_codes')
      .insert(hashedCodes.map(h => ({
        user_id: user.id,
        code_hash: h.code_hash,
        used: false
      })));

    if (insertError) {
      console.error('Error storing recovery codes:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to store recovery codes' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log security event
    await supabaseAdmin.from('auth_security_events').insert({
      user_id: user.id,
      event_type: 'recovery_codes_generated',
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
      metadata: { code_count: plainCodes.length }
    });

    console.log(`[generate-recovery-codes] Generated ${plainCodes.length} recovery codes for user ${user.id}`);

    // Return plaintext codes (only shown once)
    return new Response(
      JSON.stringify({ 
        success: true, 
        codes: plainCodes,
        message: 'Save these codes securely. They will not be shown again.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-recovery-codes] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
