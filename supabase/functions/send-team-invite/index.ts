import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { EMAIL_SENDERS, EMAIL_COLORS, TAGLINE } from "../_shared/email-config.ts";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { Heading, Paragraph, Spacer, Card, Button, InfoRow } from "../_shared/email-templates/components.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TeamInviteRequest {
  email: string;
  inviteCode: string;
  companyId?: string;
  companyName: string;
  inviterName?: string;
  role: string;
  recipientName?: string;
  customMessage?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      console.warn('RESEND_API_KEY not configured - email not sent');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Email service not configured' 
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify caller is authenticated
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body: TeamInviteRequest = await req.json();
    
    // companyId is optional for partner invites (partners are external)
    const isPartnerRole = body.role === 'partner';
    if (!body.email || !body.inviteCode || !body.companyName || (!body.companyId && !isPartnerRole)) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // SERVER-SIDE DOMAIN VALIDATION — skip for partner invites (external by definition)
    const inviteeDomain = body.email.split('@')[1]?.toLowerCase();
    if (!inviteeDomain) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const isPartnerInvite = body.role === 'partner';

    if (!isPartnerInvite) {
      const { data: domainSettings, error: domainError } = await supabase
        .from('organization_domain_settings')
        .select('domain')
        .eq('company_id', body.companyId)
        .eq('is_enabled', true);

      if (domainError) {
        console.error('Error fetching domain settings:', domainError);
      }

      const allowedDomains = domainSettings?.map(d => d.domain.toLowerCase()) || [];

      if (allowedDomains.length > 0 && !allowedDomains.includes(inviteeDomain)) {
        const allowedList = allowedDomains.map(d => `@${d}`).join(', ');
        return new Response(JSON.stringify({ 
          error: `Only emails from ${allowedList} are allowed for this company` 
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    const siteUrl = Deno.env.get('SITE_URL') || 'https://os.thequantumclub.com';
    const signupUrl = `${siteUrl}/auth?invite=${body.inviteCode}`;

    // Personalized greeting
    const greeting = body.recipientName
      ? `Hi ${body.recipientName},`
      : '';

    const inviterLine = body.inviterName
      ? `<strong>${body.inviterName}</strong> has invited you`
      : 'You have been invited';

    // Custom message block
    const customMessageBlock = body.customMessage
      ? `${Spacer(16)}${Card({
          variant: 'highlight',
          content: `<p style="margin: 0; font-style: italic; color: ${EMAIL_COLORS.textSecondary};">"${body.customMessage}"</p><p style="margin: 8px 0 0; font-size: 13px; color: ${EMAIL_COLORS.textMuted};">— ${body.inviterName || 'Your inviter'}</p>`,
        })}`
      : '';

    // Partner-specific vs standard content
    const isPartner = body.role === 'partner';
    const headingText = isPartner ? 'Partner Invitation' : "You're Invited";
    const subjectLine = isPartner
      ? `${body.inviterName || 'The Quantum Club'} has invited you to partner with The Quantum Club`
      : `You're invited to join ${body.companyName} on The Quantum Club`;

    const partnerValueProp = isPartner
      ? `${Spacer(16)}${Paragraph("As a partner, you will get access to curated shortlists, candidate dossiers, and a dedicated strategist to streamline your hiring process.", 'muted')}`
      : '';

    const emailContent = `
      ${greeting ? `${Paragraph(greeting, 'secondary')}${Spacer(8)}` : ''}
      ${Heading({ text: headingText, level: 1 })}
      ${Spacer(16)}
      ${Paragraph(`${inviterLine} to join <strong>${body.companyName}</strong> on The Quantum Club as a <strong style="color: ${EMAIL_COLORS.gold};">${body.role}</strong>.`, 'secondary')}
      ${partnerValueProp}
      ${customMessageBlock}
      ${Spacer(24)}
      ${Card({
        variant: 'highlight',
        content: `
          ${InfoRow({ icon: '🏢', label: 'Company', value: body.companyName })}
          ${InfoRow({ icon: '👤', label: 'Role', value: body.role })}
        `,
      })}
      ${Spacer(32)}
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td align="center">
            ${Button({ url: signupUrl, text: isPartner ? 'Accept Partner Invitation' : 'Accept Invitation', variant: 'primary' })}
          </td>
        </tr>
      </table>
      ${Spacer(16)}
      ${Paragraph('This invitation expires in 7 days. If you didn\'t expect this invitation, you can safely ignore this email.', 'muted')}
    `;

    const htmlContent = baseEmailTemplate({
      preheader: `${body.inviterName || 'Someone'} invited you to join ${body.companyName} on The Quantum Club`,
      content: emailContent,
      showHeader: true,
      showFooter: true,
    });

    // Use partner sender for partner invites
    const sender = isPartner ? (EMAIL_SENDERS as Record<string, string>).partners || EMAIL_SENDERS.system : EMAIL_SENDERS.system;

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: sender,
        to: body.email,
        subject: subjectLine,
        html: htmlContent,
        headers: {
          'List-Unsubscribe': `<${siteUrl}/settings/notifications>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      })
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Resend error:', errorText);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to send email' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Log the sent invite
    await supabase
      .from('comprehensive_audit_logs')
      .insert({
        actor_id: user.id,
        actor_role: 'user',
        action_type: 'team_invite_sent',
        action_category: 'communication',
        resource_type: 'invite',
        description: `Team invite sent to ${body.email} for ${body.companyName}`,
        new_value: {
          email: body.email,
          company_id: body.companyId,
          company_name: body.companyName,
          role: body.role,
          invite_code: body.inviteCode,
          recipient_name: body.recipientName || null,
          is_partner_invite: isPartner,
        },
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown'
      });

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Invitation sent to ${body.email}` 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Team invite error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
