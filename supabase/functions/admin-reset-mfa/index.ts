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
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify calling user
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: callingUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !callingUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
  } catch (error: any) {
    console.error('[admin-reset-mfa] Error:', error);
    const h = getAuthCorsHeaders(req);
    if (error.name === 'ZodError') {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { ...h, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...h, 'Content-Type': 'application/json' },
    });
  }
});
