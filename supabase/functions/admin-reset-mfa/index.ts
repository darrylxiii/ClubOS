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
      return new Response(JSON.stringify({ error: 'Forbidden: admin role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { target_user_id, reason } = requestSchema.parse(body);

    // List all MFA factors for the target user via Admin API
    const { data: factorsData, error: factorsError } = await supabaseAdmin.auth.admin.mfa.listFactors({
      userId: target_user_id,
    });

    if (factorsError) {
      console.error('[admin-reset-mfa] List factors error:', factorsError);
      return new Response(JSON.stringify({ error: 'Failed to list MFA factors' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const factors = factorsData?.factors || [];
    const deletedCount = factors.length;

    // Delete each factor
    for (const factor of factors) {
      const { error: deleteError } = await supabaseAdmin.auth.admin.mfa.deleteFactor({
        userId: target_user_id,
        factorId: factor.id,
      });

      if (deleteError) {
        console.error(`[admin-reset-mfa] Failed to delete factor ${factor.id}:`, deleteError);
      }
    }

    // Audit log
    await supabaseAdmin.from('admin_account_actions').insert({
      admin_id: callingUser.id,
      target_user_id,
      action_type: 'mfa_reset',
      reason,
      metadata: {
        ip: req.headers.get('x-forwarded-for') || 'unknown',
        factors_deleted: deletedCount,
        factor_ids: factors.map(f => f.id),
      },
    });

    console.log(`[admin-reset-mfa] Admin ${callingUser.id} reset MFA for ${target_user_id} (${deletedCount} factors deleted)`);

    return new Response(
      JSON.stringify({
        success: true,
        factors_deleted: deletedCount,
        message: `MFA reset complete. ${deletedCount} factor(s) removed.`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
}));
