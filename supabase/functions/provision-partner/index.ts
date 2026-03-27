// No serve import needed — using Deno.serve()
import { createAuthenticatedHandler } from '../_shared/handler.ts';
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { Heading, Paragraph, Spacer, Card, Button, StatusBadge } from "../_shared/email-templates/components.ts";
import { EMAIL_SENDERS, EMAIL_COLORS } from "../_shared/email-config.ts";

interface ProvisionRequest {
  email: string;
  fullName: string;
  phoneNumber?: string;
  markEmailVerified: boolean;
  markPhoneVerified: boolean;
  companyId?: string;
  companyName?: string;
  companyDomain?: string;
  companyRole: 'owner' | 'admin' | 'recruiter' | 'member';
  industry?: string;
  companySize?: string;
  provisionMethod: 'magic_link' | 'password' | 'oauth_only';
  temporaryPassword?: string;
  enableDomainAutoProvisioning?: boolean;
  domainDefaultRole?: string;
  requireDomainApproval?: boolean;
  welcomeMessage?: string;
  scheduleOnboardingCall?: boolean;
  assignedStrategistId?: string;
}

// Input length limits
const MAX_LENGTHS: Record<string, number> = {
  email: 254,
  fullName: 200,
  phoneNumber: 20,
  companyName: 100,
  companyDomain: 253,
  temporaryPassword: 128,
  welcomeMessage: 500,
  industry: 100,
  companySize: 50,
  domainDefaultRole: 50,
};

function validateLengths(body: Record<string, unknown>): string | null {
  for (const [field, max] of Object.entries(MAX_LENGTHS)) {
    const val = body[field];
    if (typeof val === 'string' && val.length > max) {
      return `${field} exceeds maximum length of ${max} characters`;
    }
  }
  return null;
}

Deno.serve(createAuthenticatedHandler(async (req, ctx) => {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const adminUser = ctx.user;

  // Check admin role
  const { data: roleData } = await ctx.supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', adminUser.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (!roleData) {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const body: ProvisionRequest = await req.json();

  // Input length validation
  const lengthError = validateLengths(body as unknown as Record<string, unknown>);
  if (lengthError) {
    return new Response(JSON.stringify({ error: lengthError }), {
      status: 400,
      headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Validate required fields
  if (!body.email || !body.fullName) {
    return new Response(JSON.stringify({ error: 'Email and full name are required' }), {
      status: 400,
      headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.email)) {
    return new Response(JSON.stringify({ error: 'Invalid email format' }), {
      status: 400,
      headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Validate phone number if provided
  if (body.phoneNumber) {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(body.phoneNumber.replace(/[^\d+]/g, ''))) {
      return new Response(JSON.stringify({ error: 'Invalid phone number format' }), {
        status: 400,
        headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // Validate company domain if provided
  if (body.companyDomain) {
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
    if (!domainRegex.test(body.companyDomain)) {
      return new Response(JSON.stringify({ error: 'Invalid company domain format' }), {
        status: 400,
        headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // Validate provision method
  if (!['magic_link', 'password', 'oauth_only'].includes(body.provisionMethod)) {
    return new Response(JSON.stringify({ error: 'Invalid provision method' }), {
      status: 400,
      headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Validate company role
  if (!['owner', 'admin', 'recruiter', 'member'].includes(body.companyRole)) {
    return new Response(JSON.stringify({ error: 'Invalid company role' }), {
      status: 400,
      headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Check if user already exists via profile lookup (fast, indexed)
  const { data: existingProfile } = await ctx.supabase
    .from('profiles')
    .select('id, email')
    .eq('email', body.email)
    .maybeSingle();

  if (existingProfile) {
    return new Response(JSON.stringify({
      error: 'User already exists',
      existingUserId: existingProfile.id
    }), {
      status: 409,
      headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Step 1: Create auth user FIRST
  const userPassword = body.provisionMethod === 'password' && body.temporaryPassword
    ? body.temporaryPassword
    : crypto.randomUUID();

  const { data: authData, error: createUserError } = await ctx.supabase.auth.admin.createUser({
    email: body.email,
    password: userPassword,
    email_confirm: body.markEmailVerified || body.provisionMethod === 'oauth_only',
    phone: body.phoneNumber,
    phone_confirm: body.markPhoneVerified,
    user_metadata: {
      full_name: body.fullName,
      provisioned_by_admin: true,
      provisioned_at: new Date().toISOString(),
      force_password_change: true
    }
  });

  if (createUserError || !authData.user) {
    console.error('User creation error:', createUserError);
    return new Response(JSON.stringify({ error: createUserError?.message || 'Failed to create user' }), {
      status: 500,
      headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const newUserId = authData.user.id;

  // Helper: rollback auth user AND newly-created company on subsequent failures
  let newCompanyId: string | null = null;
  async function rollbackUser(reason: string) {
    console.error(`Rolling back user ${newUserId}: ${reason}`);
    try {
      await ctx.supabase.auth.admin.deleteUser(newUserId);
      console.log(`Rolled back auth user ${newUserId}`);
    } catch (e) {
      console.error(`CRITICAL: Failed to rollback user ${newUserId}:`, e);
    }
    if (newCompanyId) {
      try {
        await ctx.supabase.from('companies').delete().eq('id', newCompanyId);
        console.log(`Rolled back company ${newCompanyId}`);
      } catch (e) {
        console.error(`CRITICAL: Failed to rollback company ${newCompanyId}:`, e);
      }
    }
  }

  // Step 2: Create or get company
  let companyId = body.companyId;
  let companySlug: string | null = null;

  if (!companyId && body.companyName) {
    const slug = body.companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const { data: newCompany, error: companyError } = await ctx.supabase
      .from('companies')
      .insert({
        name: body.companyName,
        slug: `${slug}-${Date.now().toString(36)}`,
        industry: body.industry,
        company_size: body.companySize,
        is_active: true,
        member_since: new Date().toISOString()
      })
      .select()
      .single();

    if (companyError) {
      console.error('Company creation error:', companyError);
      await rollbackUser('Company creation failed');
      return new Response(JSON.stringify({ error: 'Failed to create company', detail: companyError.message }), {
        status: 500,
        headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    companyId = newCompany.id;
    newCompanyId = newCompany.id;
    companySlug = newCompany.slug;

    // Explicitly create the company task board
    const { error: boardError } = await ctx.supabase
      .from('task_boards')
      .insert({
        name: `${body.companyName} Team Board`,
        description: `Shared board for all ${body.companyName} team members`,
        visibility: 'company',
        owner_id: newUserId,
        company_id: companyId,
        icon: '🏢'
      });
    if (boardError) {
      console.error('Task board creation error (non-fatal):', boardError);
    }
  } else if (companyId) {
    const { data: existingCompany } = await ctx.supabase
      .from('companies')
      .select('slug')
      .eq('id', companyId)
      .single();
    companySlug = existingCompany?.slug;
  }

  // Step 3: Update profile
  const { error: profileError } = await ctx.supabase
    .from('profiles')
    .update({
      full_name: body.fullName,
      phone: body.phoneNumber,
      provisioned_by: adminUser.id,
      provisioned_at: new Date().toISOString(),
      admin_verified_email: body.markEmailVerified,
      admin_verified_phone: body.markPhoneVerified,
      preferred_auth_method: body.provisionMethod === 'oauth_only' ? 'google' : body.provisionMethod,
      assigned_strategist_id: body.assignedStrategistId || null,
      account_status: 'approved',
      account_reviewed_at: new Date().toISOString(),
      account_approved_by: adminUser.id,
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq('id', newUserId);
  if (profileError) {
    console.error('Profile update error (FATAL):', profileError);
    await rollbackUser('Profile update failed');
    return new Response(JSON.stringify({ error: `Profile update failed: ${profileError.message}` }), {
      status: 500,
      headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Step 4: Assign partner role
  const { error: roleError } = await ctx.supabase
    .from('user_roles')
    .insert({ user_id: newUserId, role: 'partner' });
  if (roleError) {
    console.error('Role assignment error:', roleError);
    await rollbackUser('Role assignment failed');
    return new Response(JSON.stringify({ error: 'Failed to assign partner role', detail: roleError.message }), {
      status: 500,
      headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Step 4b: Assign strategist if specified
  if (body.assignedStrategistId) {
    await ctx.supabase
      .from('strategist_assignments')
      .insert({
        partner_id: newUserId,
        strategist_id: body.assignedStrategistId,
        is_active: true,
        assignment_type: 'partner_provisioning',
        notes: 'Assigned during partner provisioning'
      });
  }

  // Step 5: Add to company members
  if (companyId) {
    const { error: memberError } = await ctx.supabase
      .from('company_members')
      .insert({
        user_id: newUserId,
        company_id: companyId,
        role: body.companyRole,
        is_active: true
      });
    if (memberError) {
      console.error('Company member insert error (FATAL):', memberError);
      await rollbackUser('Company member linking failed');
      return new Response(JSON.stringify({ error: `Company member linking failed: ${memberError.message}` }), {
        status: 500,
        headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // Step 6: Domain auto-provisioning
  if (body.enableDomainAutoProvisioning && body.companyDomain && companyId) {
    await ctx.supabase
      .from('organization_domain_settings')
      .upsert({
        company_id: companyId,
        domain: body.companyDomain.toLowerCase(),
        is_enabled: true,
        auto_provision_users: true,
        default_role: body.domainDefaultRole || 'member',
        require_admin_approval: body.requireDomainApproval ?? true,
        allow_google_oauth: true,
        created_by: adminUser.id
      }, { onConflict: 'company_id,domain' });
  }

  // Auto-create domain from partner's email domain
  const partnerEmailDomain = body.email.split('@')[1]?.toLowerCase();
  if (partnerEmailDomain && companyId) {
    const { data: existingDomain } = await ctx.supabase
      .from('organization_domain_settings')
      .select('id')
      .eq('company_id', companyId)
      .eq('domain', partnerEmailDomain)
      .maybeSingle();

    if (!existingDomain) {
      await ctx.supabase
        .from('organization_domain_settings')
        .insert({
          company_id: companyId,
          domain: partnerEmailDomain,
          is_enabled: true,
          auto_provision_users: false,
          default_role: 'member',
          require_admin_approval: true,
          allow_google_oauth: true,
          created_by: adminUser.id
        });
    }
  }

  // Step 7: Generate magic link
  let magicLink: string | null = null;
  if (body.provisionMethod === 'magic_link') {
    const siteUrl = Deno.env.get('SITE_URL') || Deno.env.get('APP_URL') || 'https://os.thequantumclub.com';
    const { data: linkData, error: linkError } = await ctx.supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: body.email,
      options: { redirectTo: `${siteUrl}/partner-setup` }
    });

    if (!linkError && linkData?.properties?.action_link) {
      magicLink = linkData.properties.action_link;
    }
  }

  // Step 8: Create invite code
  const inviteCode = `PARTNER-${Date.now().toString(36).toUpperCase()}`;
  const { error: inviteError } = await ctx.supabase
    .from('invite_codes')
    .insert({
      code: inviteCode,
      created_by: adminUser.id,
      created_by_type: 'admin',
      max_uses: 1,
      uses_count: 0,
      expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      invite_type: 'partner',
      company_id: companyId,
      target_role: 'partner',
      provisioned_by: adminUser.id,
      welcome_message: body.welcomeMessage
    });
  if (inviteError) {
    console.error('Step 8 -- invite_codes insert failed:', inviteError);
  }

  // Step 9: Provisioning log
  const { error: provLogError } = await ctx.supabase
    .from('partner_provisioning_logs')
    .insert({
      provisioned_user_id: newUserId,
      provisioned_by: adminUser.id,
      company_id: companyId,
      provision_method: body.provisionMethod,
      email_verified_by_admin: body.markEmailVerified,
      phone_verified_by_admin: body.markPhoneVerified,
      invite_code_generated: inviteCode,
      assigned_strategist_id: body.assignedStrategistId || null,
      metadata: {
        company_role: body.companyRole,
        domain_provisioning: body.enableDomainAutoProvisioning,
        welcome_message: body.welcomeMessage
      }
    });
  if (provLogError) {
    console.error('Step 9 -- partner_provisioning_logs insert failed:', provLogError);
  }

  // Step 10: Welcome email via dedicated partner function
  let welcomeEmailSent = false;
  if (resendApiKey && body.provisionMethod !== 'oauth_only') {
    try {
      // Resolve strategist name if assigned
      let strategistName: string | undefined;
      if (body.assignedStrategistId) {
        const { data: strategist } = await ctx.supabase
          .from('profiles')
          .select('full_name')
          .eq('id', body.assignedStrategistId)
          .single();
        strategistName = strategist?.full_name || undefined;
      }

      const welcomePayload = {
        email: body.email,
        fullName: body.fullName,
        companyName: body.companyName || undefined,
        magicLink: magicLink || undefined,
        inviteCode,
        welcomeMessage: body.welcomeMessage || undefined,
        assignedStrategistName: strategistName,
        provisionMethod: body.provisionMethod,
      };

      const welcomeResponse = await fetch(
        `${supabaseUrl}/functions/v1/send-partner-welcome-email`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(welcomePayload),
        }
      );

      const welcomeResult = await welcomeResponse.json();
      welcomeEmailSent = welcomeResult.success === true;

      if (welcomeEmailSent) {
        await ctx.supabase
          .from('partner_provisioning_logs')
          .update({
            welcome_email_sent: true,
            welcome_email_sent_at: new Date().toISOString()
          })
          .eq('provisioned_user_id', newUserId);
      } else {
        console.error('Partner welcome email failed:', welcomeResult);
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError);
    }
  }

  // Step 11: Audit log
  const { error: auditError } = await ctx.supabase
    .from('comprehensive_audit_logs')
    .insert({
      actor_id: adminUser.id,
      actor_role: 'admin',
      event_type: 'partner_provisioned',
      action: 'partner_provisioned',
      event_category: 'user_management',
      resource_type: 'user',
      resource_id: newUserId,
      description: `Provisioned partner account for ${body.email}`,
      after_value: {
        email: body.email,
        full_name: body.fullName,
        company_id: companyId,
        provision_method: body.provisionMethod,
        email_verified: body.markEmailVerified,
        phone_verified: body.markPhoneVerified
      },
      actor_ip_address: (() => { const raw = req.headers.get('x-forwarded-for'); return raw ? raw.split(',')[0].trim() : null; })(),
      actor_user_agent: req.headers.get('user-agent') || 'unknown'
    });
  if (auditError) {
    console.error('Step 11 -- comprehensive_audit_logs insert failed:', auditError);
  }

  return new Response(JSON.stringify({
    success: true,
    user_id: newUserId,
    company_id: companyId,
    company_slug: companySlug,
    invite_code: inviteCode,
    magic_link: magicLink,
    welcome_email_sent: welcomeEmailSent,
    message: `Partner ${body.fullName} provisioned successfully`
  }), {
    status: 200,
    headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' }
  });
}));
