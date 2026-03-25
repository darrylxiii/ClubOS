import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Extract user ID from JWT (verify_jwt = false, so we decode manually)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const token = authHeader.replace('Bearer ', '');
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let userId: string;
    try {
      const payload = JSON.parse(atob(payloadBase64));
      userId = payload.sub;
      if (!userId) throw new Error('No sub claim');
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid token payload' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Service client for DB operations
    const supabase = createClient(supabaseUrl, serviceKey);

    // Check admin role via user_roles table
    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', userId);
    const userRoles = (roles || []).map((r: any) => r.role);
    if (!userRoles.includes('admin') && !userRoles.includes('super_admin') && !userRoles.includes('strategist')) {
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
        updates.linkedin_password_encrypted = btoa(linkedinPassword);
      }

      if (emailAccountPassword) {
        updates.email_account_password_encrypted = btoa(emailAccountPassword);
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
