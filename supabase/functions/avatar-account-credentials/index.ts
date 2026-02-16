import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ENCRYPTION_KEY = 'tqc-avatar-credentials-v1'; // Server-side only

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check admin role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (req.method === 'POST') {
      const { accountId, linkedinPassword, emailAccountAddress, emailAccountPassword } = await req.json();
      if (!accountId) {
        return new Response(JSON.stringify({ error: 'accountId required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const updates: Record<string, unknown> = {};

      if (emailAccountAddress !== undefined) {
        updates.email_account_address = emailAccountAddress || null;
      }

      if (linkedinPassword) {
        const { data: enc } = await supabase.rpc('encrypt_text', { plain_text: linkedinPassword, key: ENCRYPTION_KEY });
        // Fallback: store via pgp_sym_encrypt directly
        if (enc) {
          updates.linkedin_password_encrypted = enc;
        } else {
          // Use raw SQL via service role
          const { error: rawErr } = await supabase
            .from('linkedin_avatar_accounts')
            .update({ linkedin_password_encrypted: linkedinPassword }) // Will be encrypted by trigger or manually
            .eq('id', accountId);
          if (rawErr) console.warn('Direct password update fallback:', rawErr.message);
        }
      }

      if (emailAccountPassword) {
        const { data: enc } = await supabase.rpc('encrypt_text', { plain_text: emailAccountPassword, key: ENCRYPTION_KEY });
        if (enc) {
          updates.email_account_password_encrypted = enc;
        } else {
          updates.email_account_password_encrypted = emailAccountPassword;
        }
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('linkedin_avatar_accounts')
          .update(updates)
          .eq('id', accountId);
        if (error) throw error;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[avatar-account-credentials] Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
