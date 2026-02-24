// No serve import needed — using Deno.serve()
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { Heading, Paragraph, Spacer, Card, Button, StatusBadge } from "../_shared/email-templates/components.ts";
import { EMAIL_SENDERS, EMAIL_COLORS } from "../_shared/email-config.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify admin role from JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !adminUser) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', adminUser.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body: ProvisionRequest = await req.json();

    // Input length validation
    const lengthError = validateLengths(body as unknown as Record<string, unknown>);
    if (lengthError) {
      return new Response(JSON.stringify({ error: lengthError }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Validate required fields
    if (!body.email || !body.fullName) {
      return new Response(JSON.stringify({ error: 'Email and full name are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate phone number if provided
    if (body.phoneNumber) {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(body.phoneNumber.replace(/[^\d+]/g, ''))) {
        return new Response(JSON.stringify({ error: 'Invalid phone number format' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Validate company domain if provided
    if (body.companyDomain) {
      const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
      if (!domainRegex.test(body.companyDomain)) {
        return new Response(JSON.stringify({ error: 'Invalid company domain format' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Validate provision method
    if (!['magic_link', 'password', 'oauth_only'].includes(body.provisionMethod)) {
      return new Response(JSON.stringify({ error: 'Invalid provision method' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate company role
    if (!['owner', 'admin', 'recruiter', 'member'].includes(body.companyRole)) {
      return new Response(JSON.stringify({ error: 'Invalid company role' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if user already exists via profile lookup (fast, indexed)
    const { data: existingProfile } = await supabase
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ──────────────────────────────────────────────────────────
    // Step 1: Create auth user FIRST (API call, not DB — rollback via deleteUser)
    // ──────────────────────────────────────────────────────────
    const userPassword = body.provisionMethod === 'password' && body.temporaryPassword
      ? body.temporaryPassword
      : crypto.randomUUID();

    const { data: authData, error: createUserError } = await supabase.auth.admin.createUser({
      email: body.email,
      password: userPassword,
      email_confirm: body.markEmailVerified || body.provisionMethod === 'oauth_only',
      phone: body.phoneNumber,
      phone_confirm: body.markPhoneVerified,
      user_metadata: {
        full_name: body.fullName,
        provisioned_by_admin: true,
        provisioned_at: new Date().toISOString()
      }
    });

    if (createUserError || !authData.user) {
      console.error('User creation error:', createUserError);
      return new Response(JSON.stringify({ error: createUserError?.message || 'Failed to create user' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const newUserId = authData.user.id;

    // Helper: rollback auth user on subsequent failures
    async function rollbackUser(reason: string) {
      console.error(`Rolling back user ${newUserId}: ${reason}`);
      try {
        await supabase.auth.admin.deleteUser(newUserId);
        console.log(`Rolled back auth user ${newUserId}`);
      } catch (e) {
        console.error(`CRITICAL: Failed to rollback user ${newUserId}:`, e);
      }
    }

    // ──────────────────────────────────────────────────────────
    // Step 2: Create or get company
    // ──────────────────────────────────────────────────────────
    let companyId = body.companyId;
    let companySlug: string | null = null;
    
    if (!companyId && body.companyName) {
      const slug = body.companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      
      const { data: newCompany, error: companyError } = await supabase
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
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      companyId = newCompany.id;
      companySlug = newCompany.slug;

      // Explicitly create the company task board (trigger skips when auth.uid() is NULL)
      const { error: boardError } = await supabase
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
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('slug')
        .eq('id', companyId)
        .single();
      companySlug = existingCompany?.slug;
    }

    // ──────────────────────────────────────────────────────────
    // Step 3: Update profile
    // ──────────────────────────────────────────────────────────
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: body.fullName,
        phone: body.phoneNumber,
        provisioned_by: adminUser.id,
        provisioned_at: new Date().toISOString(),
        admin_verified_email: body.markEmailVerified,
        admin_verified_phone: body.markPhoneVerified,
        preferred_auth_method: body.provisionMethod === 'oauth_only' ? 'google' : body.provisionMethod,
        assigned_strategist_id: body.assignedStrategistId || null
      })
      .eq('id', newUserId);
    if (profileError) {
      console.error('Profile update error:', profileError);
    }

    // ──────────────────────────────────────────────────────────
    // Step 4: Assign partner role
    // ──────────────────────────────────────────────────────────
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({ user_id: newUserId, role: 'partner' });
    if (roleError) {
      console.error('Role assignment error:', roleError);
      await rollbackUser('Role assignment failed');
      return new Response(JSON.stringify({ error: 'Failed to assign partner role', detail: roleError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Step 4b: Assign strategist if specified
    if (body.assignedStrategistId) {
      await supabase
        .from('strategist_assignments')
        .insert({
          partner_id: newUserId,
          strategist_id: body.assignedStrategistId,
          is_active: true,
          assignment_type: 'partner_provisioning',
          notes: 'Assigned during partner provisioning'
        });
    }

    // ──────────────────────────────────────────────────────────
    // Step 5: Add to company members
    // ──────────────────────────────────────────────────────────
    if (companyId) {
      const { error: memberError } = await supabase
        .from('company_members')
        .insert({
          user_id: newUserId,
          company_id: companyId,
          role: body.companyRole,
          is_active: true
        });
      if (memberError) {
        console.error('Company member insert error:', memberError);
      }
    }

    // ──────────────────────────────────────────────────────────
    // Step 6: Domain auto-provisioning
    // ──────────────────────────────────────────────────────────
    if (body.enableDomainAutoProvisioning && body.companyDomain && companyId) {
      await supabase
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
      const { data: existingDomain } = await supabase
        .from('organization_domain_settings')
        .select('id')
        .eq('company_id', companyId)
        .eq('domain', partnerEmailDomain)
        .maybeSingle();

      if (!existingDomain) {
        await supabase
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

    // ──────────────────────────────────────────────────────────
    // Step 7: Generate magic link
    // ──────────────────────────────────────────────────────────
    let magicLink: string | null = null;
    if (body.provisionMethod === 'magic_link') {
      const siteUrl = Deno.env.get('SITE_URL') || Deno.env.get('APP_URL') || 'https://os.thequantumclub.com';
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: body.email,
        options: { redirectTo: `${siteUrl}/partner-welcome` }
      });

      if (!linkError && linkData?.properties?.action_link) {
        magicLink = linkData.properties.action_link;
      }
    }

    // ──────────────────────────────────────────────────────────
    // Step 8: Create invite code
    // ──────────────────────────────────────────────────────────
    const inviteCode = `PARTNER-${Date.now().toString(36).toUpperCase()}`;
    const { error: inviteError } = await supabase
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
      console.error('Step 8 – invite_codes insert failed:', inviteError);
    }

    // ──────────────────────────────────────────────────────────
    // Step 9: Provisioning log
    // ──────────────────────────────────────────────────────────
    const { error: provLogError } = await supabase
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
      console.error('Step 9 – partner_provisioning_logs insert failed:', provLogError);
    }

    // ──────────────────────────────────────────────────────────
    // Step 10: Welcome email
    // ──────────────────────────────────────────────────────────
    let welcomeEmailSent = false;
    if (resendApiKey && body.provisionMethod !== 'oauth_only') {
      try {
        const emailContent = body.provisionMethod === 'magic_link' && magicLink
          ? `
            ${StatusBadge({ status: 'confirmed', text: 'PARTNER ACCESS GRANTED' })}
            ${Heading({ text: 'Welcome to The Quantum Club', level: 1 })}
            ${Spacer(24)}
            ${Paragraph(`Dear ${body.fullName},`, 'primary')}
            ${Spacer(8)}
            ${Paragraph(`You've been personally invited to join The Quantum Club as a valued partner.${body.welcomeMessage ? `<br><br><em style="color: ${EMAIL_COLORS.gold};">"${body.welcomeMessage}"</em>` : ''}`, 'secondary')}
            ${Spacer(32)}
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr><td align="center">${Button({ url: magicLink, text: 'Access Your Account', variant: 'primary' })}</td></tr>
            </table>
            ${Spacer(16)}
            ${Paragraph('This link expires in 72 hours. If you have any questions, your dedicated strategist is ready to assist.', 'muted')}
          `
          : `
            ${Heading({ text: 'Welcome to The Quantum Club', level: 1 })}
            ${Spacer(24)}
            ${Paragraph(`Dear ${body.fullName},`, 'primary')}
            ${Spacer(8)}
            ${Paragraph("You've been invited to join The Quantum Club as a partner. Please sign in using Google or request a magic link from your strategist.", 'secondary')}
            ${Spacer(8)}
            ${Paragraph('For security, temporary passwords are not sent via email.', 'muted')}
          `;

        const emailBody = baseEmailTemplate({
          preheader: 'Welcome to The Quantum Club — your partner access is ready.',
          content: emailContent,
          showHeader: true,
          showFooter: true,
        });

        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: EMAIL_SENDERS.notifications,
            to: body.email,
            subject: 'Welcome to The Quantum Club - Your Partner Access',
            html: emailBody
          })
        });

        if (!emailResponse.ok) {
          const errorBody = await emailResponse.text();
          console.error('Resend email error:', emailResponse.status, errorBody);
        }
        welcomeEmailSent = emailResponse.ok;
        
        if (welcomeEmailSent) {
          await supabase
            .from('partner_provisioning_logs')
            .update({ 
              welcome_email_sent: true,
              welcome_email_sent_at: new Date().toISOString()
            })
            .eq('provisioned_user_id', newUserId);
        }
      } catch (emailError) {
        console.error('Email sending error:', emailError);
      }
    }

    // ──────────────────────────────────────────────────────────
    // Step 11: Audit log
    // ──────────────────────────────────────────────────────────
    const { error: auditError } = await supabase
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
        actor_ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        actor_user_agent: req.headers.get('user-agent') || 'unknown'
      });
    if (auditError) {
      console.error('Step 11 – comprehensive_audit_logs insert failed:', auditError);
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
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Provisioning error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
