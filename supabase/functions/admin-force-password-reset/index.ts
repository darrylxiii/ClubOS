import { createAuthenticatedHandler } from '../_shared/handler.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const requestSchema = z.object({
  target_user_id: z.string().uuid(),
  reason: z.string().min(5).max(500),
});

Deno.serve(createAuthenticatedHandler(async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const supabaseAdmin = ctx.supabase;
  const callingUser = ctx.user;

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
}));
