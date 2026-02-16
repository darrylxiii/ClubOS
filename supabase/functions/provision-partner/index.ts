import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ProvisionRequest {
  // Contact Information
  email: string;
  fullName: string;
  phoneNumber?: string;
  
  // Verification
  markEmailVerified: boolean;
  markPhoneVerified: boolean;
  
  // Company Configuration
  companyId?: string;
  companyName?: string;
  companyDomain?: string;
  companyRole: 'owner' | 'admin' | 'recruiter' | 'member';
  industry?: string;
  companySize?: string;
  
  // Authentication
  provisionMethod: 'magic_link' | 'password' | 'oauth_only';
  temporaryPassword?: string;
  
  // Domain Settings
  enableDomainAutoProvisioning?: boolean;
  domainDefaultRole?: string;
  requireDomainApproval?: boolean;
  
  // Welcome Experience
  welcomeMessage?: string;
  scheduleOnboardingCall?: boolean;
  assignedStrategistId?: string;
}

serve(async (req) => {
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

    // Check if user already exists (scalable: single lookup instead of listUsers)
    const { data: existingUserList } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });
    // Use a direct query approach: try to create, catch conflict
    // First, check via email lookup on profiles (fast, indexed)
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

    // Step 1: Create or get company
    let companyId = body.companyId;
    let companySlug: string | null = null;
    
    if (!companyId && body.companyName) {
      // Create new company
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
        return new Response(JSON.stringify({ error: 'Failed to create company' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      companyId = newCompany.id;
      companySlug = newCompany.slug;
    } else if (companyId) {
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('slug')
        .eq('id', companyId)
        .single();
      companySlug = existingCompany?.slug;
    }

    // Step 2: Create auth user with admin API
    const userPassword = body.provisionMethod === 'password' && body.temporaryPassword
      ? body.temporaryPassword
      : crypto.randomUUID(); // Random password for magic link/oauth users

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

    // Step 3: Update profile with provisioning info
    await supabase
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

    // Step 4: Assign partner role
    await supabase
      .from('user_roles')
      .insert({
        user_id: newUserId,
        role: 'partner'
      });

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

    // Step 5: Add to company members
    if (companyId) {
      await supabase
        .from('company_members')
        .insert({
          user_id: newUserId,
          company_id: companyId,
          role: body.companyRole,
          is_active: true
        });
    }

    // Step 6: Setup domain auto-provisioning if requested
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
        }, {
          onConflict: 'company_id,domain'
        });
    }

    // Step 6b: Auto-create domain setting from partner's email domain (if not already created)
    // This ensures every provisioned partner's company has at least one authorized domain
    const partnerEmailDomain = body.email.split('@')[1]?.toLowerCase();
    if (partnerEmailDomain && companyId) {
      // Check if domain already exists
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

    // Step 7: Generate magic link if needed
    let magicLink: string | null = null;
    if (body.provisionMethod === 'magic_link') {
      // Use SITE_URL or APP_URL env var; never derive from supabaseUrl
      const siteUrl = Deno.env.get('SITE_URL') || Deno.env.get('APP_URL') || 'https://os.thequantumclub.com';
      // Route pre-provisioned partners to partner welcome screen
      const redirectPath = '/partner-welcome';
      
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: body.email,
        options: {
          redirectTo: `${siteUrl}${redirectPath}`
        }
      });

      if (!linkError && linkData?.properties?.action_link) {
        magicLink = linkData.properties.action_link;
      }
    }

    // Step 8: Create invite code
    const inviteCode = `PARTNER-${Date.now().toString(36).toUpperCase()}`;
    await supabase
      .from('invite_codes')
      .insert({
        code: inviteCode,
        created_by: adminUser.id,
        max_uses: 1,
        uses_count: 0,
        expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), // 72 hours
        invite_type: 'partner',
        company_id: companyId,
        target_role: 'partner',
        provisioned_by: adminUser.id,
        welcome_message: body.welcomeMessage
      });

    // Step 9: Log provisioning
    await supabase
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

    // Step 10: Send welcome email via Resend if available
    let welcomeEmailSent = false;
    if (resendApiKey && body.provisionMethod !== 'oauth_only') {
      try {
        const emailBody = body.provisionMethod === 'magic_link' && magicLink
          ? `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #0E0E10; color: #F5F4EF;">
              <div style="text-align: center; margin-bottom: 40px;">
                <h1 style="color: #C9A24E; font-size: 28px; margin: 0; font-weight: 300;">The Quantum Club</h1>
              </div>
              
              <div style="background: rgba(255,255,255,0.05); border-radius: 16px; padding: 32px; border: 1px solid rgba(201,162,78,0.2);">
                <p style="color: #F5F4EF; font-size: 16px; line-height: 1.6;">Dear ${body.fullName},</p>
                
                <p style="color: #A8A8A8; font-size: 16px; line-height: 1.6;">
                  You've been personally invited to join The Quantum Club as a valued partner.
                  ${body.welcomeMessage ? `<br><br><em style="color: #C9A24E;">"${body.welcomeMessage}"</em>` : ''}
                </p>
                
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${magicLink}" style="display: inline-block; background: linear-gradient(135deg, #C9A24E 0%, #E5C87D 100%); color: #0E0E10; font-weight: 600; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-size: 16px;">
                    Access Your Account
                  </a>
                </div>
                
                <p style="color: #666; font-size: 14px; line-height: 1.6;">
                  This link expires in 72 hours. If you have any questions, your dedicated strategist is ready to assist.
                </p>
              </div>
              
              <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 40px 0;" />
              
              <p style="color: #666; font-size: 12px; text-align: center;">
                The Quantum Club · Elite Talent Network
              </p>
            </div>
          `
          : `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #0E0E10; color: #F5F4EF;">
              <div style="text-align: center; margin-bottom: 40px;">
                <h1 style="color: #C9A24E; font-size: 28px; margin: 0; font-weight: 300;">The Quantum Club</h1>
              </div>
              <div style="background: rgba(255,255,255,0.05); border-radius: 16px; padding: 32px; border: 1px solid rgba(201,162,78,0.2);">
                <p style="color: #F5F4EF; font-size: 16px; line-height: 1.6;">Dear ${body.fullName},</p>
                <p style="color: #A8A8A8; font-size: 16px; line-height: 1.6;">
                  You've been invited to join The Quantum Club as a partner. Please sign in using Google or request a magic link from your strategist.
                </p>
                <p style="color: #666; font-size: 14px;">For security, temporary passwords are not sent via email.</p>
              </div>
              <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 40px 0;" />
              <p style="color: #666; font-size: 12px; text-align: center;">The Quantum Club · Elite Talent Network</p>
            </div>
          `;

        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'The Quantum Club <noreply@thequantumclub.com>',
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

    // Step 11: Create comprehensive audit log
    await supabase
      .from('comprehensive_audit_logs')
      .insert({
        actor_id: adminUser.id,
        actor_role: 'admin',
        action_type: 'partner_provisioned',
        action_category: 'user_management',
        resource_type: 'user',
        resource_id: newUserId,
        description: `Provisioned partner account for ${body.email}`,
        new_value: {
          email: body.email,
          full_name: body.fullName,
          company_id: companyId,
          provision_method: body.provisionMethod,
          email_verified: body.markEmailVerified,
          phone_verified: body.markPhoneVerified
        },
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown'
      });

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
