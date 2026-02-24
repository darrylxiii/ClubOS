/**
 * One-Click Admin Provisioning for Partner Requests
 * Provisions a partner account directly from an approval action in the admin panel.
 * Uses Deno.serve() — the only supported entry point.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ProvisionPayload {
  requestId: string;
  approvedBy: string;
}

Deno.serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { requestId, approvedBy } = (await req.json()) as ProvisionPayload;

    if (!requestId) {
      return new Response(
        JSON.stringify({ error: 'requestId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Fetch the partner request
    const { data: request, error: fetchError } = await supabase
      .from('partner_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      return new Response(
        JSON.stringify({ error: 'Partner request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Idempotency guard
    if (request.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: `Request is already ${request.status}`, idempotent: true }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Step 1: Create auth user ──
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.admin.createUser({
      email: request.contact_email,
      email_confirm: true,
      user_metadata: {
        full_name: request.contact_name,
        phone: request.contact_phone,
        provisioned_by_admin: true,
        provisioned_at: new Date().toISOString(),
      },
    });

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: `Auth creation failed: ${authError?.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rollback helper
    async function rollbackUser(reason: string) {
      console.error(`Rolling back user ${user!.id}: ${reason}`);
      try {
        await supabase.auth.admin.deleteUser(user!.id);
      } catch (e) {
        console.error(`CRITICAL: rollback failed for ${user!.id}:`, e);
      }
    }

    // ── Step 2: Create company if needed ──
    let companyId = request.company_id;
    if (!companyId && request.company_name) {
      const domain = request.contact_email.split('@')[1]?.toLowerCase() || '';
      const slug = request.company_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: request.company_name,
          slug: `${slug}-${Date.now().toString(36)}`,
          domain,
          status: 'active',
        })
        .select()
        .single();

      if (companyError) {
        console.error('Company creation error:', companyError);
        await rollbackUser('Company creation failed');
        return new Response(
          JSON.stringify({ error: `Company creation failed: ${companyError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      companyId = company?.id;

      // Explicitly create company task board (trigger skips when auth.uid() is NULL)
      if (companyId) {
        const { error: boardError } = await supabase
          .from('task_boards')
          .insert({
            name: `${request.company_name} Team Board`,
            description: `Shared board for all ${request.company_name} team members`,
            visibility: 'company',
            owner_id: user.id,
            company_id: companyId,
            icon: '🏢',
          });
        if (boardError) {
          console.error('Task board creation error (non-fatal):', boardError);
        }
      }
    }

    // ── Step 3: Assign partner role ──
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: user.id,
        role: 'partner',
        company_id: companyId,
      });

    if (roleError) {
      console.error('Role assignment error:', roleError);
      await rollbackUser('Role assignment failed');
      return new Response(
        JSON.stringify({ error: `Role assignment failed: ${roleError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Step 4: Update profile ──
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: request.contact_name,
        phone: request.contact_phone,
      })
      .eq('id', user.id);

    if (profileError) {
      console.error('Profile update error (non-fatal):', profileError);
    }

    // ── Step 5: Update partner request status ──
    const { error: updateError } = await supabase
      .from('partner_requests')
      .update({ status: 'approved' })
      .eq('id', requestId);

    if (updateError) {
      console.error('Request update error:', updateError);
    }

    // ── Step 6: Generate magic link ──
    const siteUrl = Deno.env.get('SITE_URL') || Deno.env.get('APP_URL') || 'https://os.thequantumclub.com';
    const {
      data: { properties: magicLinkData },
      error: linkError,
    } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: request.contact_email,
      options: { redirectTo: `${siteUrl}/partner-welcome` },
    });

    if (linkError || !magicLinkData) {
      console.error('Magic link generation error:', linkError);
    }

    // ── Step 7: Audit log ──
    const { error: auditError } = await supabase
      .from('comprehensive_audit_logs')
      .insert({
        actor_id: approvedBy || null,
        actor_role: 'admin',
        event_type: 'partner_request_approved',
        action: 'partner_request_approved',
        event_category: 'user_management',
        resource_type: 'partner_request',
        resource_id: requestId,
        description: `Approved partner request for ${request.contact_email}`,
        after_value: {
          user_id: user.id,
          company_id: companyId,
          email: request.contact_email,
        },
        actor_ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        actor_user_agent: req.headers.get('user-agent') || 'unknown',
      });
    if (auditError) {
      console.error('Audit log insert failed:', auditError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId: user.id,
        companyId,
        message: 'Partner provisioned successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Provisioning error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
