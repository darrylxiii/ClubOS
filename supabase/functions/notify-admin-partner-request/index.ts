import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { getAppUrl } from "../_shared/app-config.ts";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { Heading, Paragraph, Spacer, Card, Button, AlertBox, InfoRow } from "../_shared/email-templates/components.ts";
import { EMAIL_SENDERS } from "../_shared/email-config.ts";
import { sendEmail } from '../_shared/resend-client.ts';

import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { requestId, name, email, type, company, industry, companySize, timeline, budget, rolesPerYear, website, location, phone } = await req.json();

    if (!requestId || !name || !email) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get admin users to notify
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')
      .limit(10);

    if (!adminRoles?.length) {
      console.warn('No admin users found to notify');
      return new Response(JSON.stringify({ success: true, notified: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const adminIds = adminRoles.map(r => r.user_id);

    // Get admin emails
    const { data: adminProfiles } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', adminIds);

    const adminEmails = adminProfiles?.map(p => p.email).filter(Boolean) || [];

    // Create in-app notifications for all admins
    const notifications = adminIds.map(adminId => ({
      user_id: adminId,
      type: 'partner_request',
      title: `New ${type || 'partner'} request from ${name}`,
      message: `${name} (${email})${company ? ` from ${company}` : ''}${industry ? ` · ${industry}` : ''} submitted a membership request.${timeline ? ` Timeline: ${timeline}.` : ''} Review in the admin panel.`,
      action_url: '/admin/members',
      metadata: { request_id: requestId },
      is_read: false,
    }));

    const { error: notifError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notifError) {
      console.error('Failed to create notifications:', notifError);
    }

    // Send email notification to admins via Resend
    let emailsSent = 0;
    if (adminEmails.length > 0) {
      const appUrl = getAppUrl();
      const reviewUrl = `${appUrl}/admin/members`;

      const emailContent = `
        ${AlertBox({ type: 'warning', title: 'New Request Requires Review', message: `A new ${type || 'partner'} membership request has been submitted and is awaiting your review.` })}
        ${Heading({ text: `New ${type || 'Partner'} Request`, level: 1 })}
        ${Spacer(24)}
        ${Card({
          variant: 'default',
          content: `
            ${InfoRow({ icon: '👤', label: 'Name', value: name })}
            ${InfoRow({ icon: '📧', label: 'Email', value: email })}
            ${InfoRow({ icon: '🏷️', label: 'Type', value: (type || 'partner').charAt(0).toUpperCase() + (type || 'partner').slice(1) })}
            ${company ? InfoRow({ icon: '🏢', label: 'Company', value: company }) : ''}
            ${industry ? InfoRow({ icon: '🏭', label: 'Industry', value: industry }) : ''}
            ${companySize ? InfoRow({ icon: '👥', label: 'Company Size', value: companySize }) : ''}
            ${timeline ? InfoRow({ icon: '📅', label: 'Timeline', value: timeline }) : ''}
            ${budget ? InfoRow({ icon: '💰', label: 'Budget', value: budget }) : ''}
            ${rolesPerYear ? InfoRow({ icon: '🎯', label: 'Roles/Year', value: rolesPerYear }) : ''}
            ${website ? InfoRow({ icon: '🌐', label: 'Website', value: website }) : ''}
            ${location ? InfoRow({ icon: '📍', label: 'Location', value: location }) : ''}
            ${phone ? InfoRow({ icon: '📞', label: 'Phone', value: phone }) : ''}
          `,
        })}
        ${Spacer(32)}
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center">
              ${Button({ url: reviewUrl, text: 'Review Request', variant: 'primary' })}
            </td>
          </tr>
        </table>
        ${Spacer(16)}
        ${Paragraph('This is an automated admin notification from The Quantum Club.', 'muted')}
      `;

      const emailHtml = baseEmailTemplate({
        preheader: `New ${type || 'partner'} request from ${name} — review required`,
        content: emailContent,
        showHeader: true,
        showFooter: false,
      });

      try {
        const resendData = await sendEmail({
          from: EMAIL_SENDERS.notifications,
          to: adminEmails,
          subject: `New ${type || 'partner'} request: ${name}`,
          html: emailHtml,
        });
        console.log('Admin notification email sent, Resend ID:', resendData.id);
        emailsSent = adminEmails.length;
      } catch (emailErr) {
        console.error('Email send error:', emailErr);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      notified: adminIds.length,
      emails_sent: emailsSent,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Notify admin error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
