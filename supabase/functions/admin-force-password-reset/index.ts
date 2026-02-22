import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getAuthCorsHeaders, authCorsPreFlight } from "../_shared/auth-cors.ts";

const requestSchema = z.object({
  target_user_id: z.string().uuid(),
  reason: z.string().min(5).max(500),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return authCorsPreFlight(req);

  const corsHeaders = getAuthCorsHeaders(req);

  try {
    // Verify the calling user is an admin
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Create a client with the user's token to check their identity
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: callingUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !callingUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Verify admin role
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callingUser.id)
      .eq('role', 'admin');

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin role required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const { target_user_id, reason } = requestSchema.parse(body);

    // Generate a temporary password
    const tempBytes = new Uint8Array(16);
    crypto.getRandomValues(tempBytes);
    const tempPassword = 'Tmp!' + Array.from(tempBytes).map(b => b.toString(36)).join('').substring(0, 16);

    // Force password change and set metadata flag
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(target_user_id, {
      password: tempPassword,
      user_metadata: { force_password_change: true },
    });

    if (updateError) {
      console.error('[admin-force-password-reset] Update error:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to reset password' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Invalidate all sessions
    try {
      await supabaseAdmin.auth.admin.signOut(target_user_id, 'global');
    } catch (e) {
      console.error('[admin-force-password-reset] Session invalidation error:', e);
    }

    // Audit log
    await supabaseAdmin.from('admin_account_actions').insert({
      admin_id: callingUser.id,
      target_user_id,
      action_type: 'force_password_reset',
      reason,
      metadata: { ip: req.headers.get('x-forwarded-for') || 'unknown' },
    });

    console.log(`[admin-force-password-reset] Admin ${callingUser.id} reset password for ${target_user_id}`);

    return new Response(
      JSON.stringify({ success: true, temp_password: tempPassword, message: 'Password reset. User must change on next login.' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[admin-force-password-reset] Error:', error);
    const h = getAuthCorsHeaders(req);
    if (error.name === 'ZodError') return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers: { ...h, 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { ...h, 'Content-Type': 'application/json' } });
  }
});
