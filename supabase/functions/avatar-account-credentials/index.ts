import { createAuthenticatedHandler } from '../_shared/handler.ts';

Deno.serve(createAuthenticatedHandler(async (req, ctx) => {
    const corsHeaders = ctx.corsHeaders;
    const userId = ctx.user.id;
    const supabase = ctx.supabase;

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
}));
