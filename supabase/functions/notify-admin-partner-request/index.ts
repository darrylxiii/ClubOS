import { createHandler } from '../_shared/handler.ts';
import { getAppUrl } from "../_shared/app-config.ts";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { Heading, Paragraph, Spacer, Card, Button, AlertBox, InfoRow } from "../_shared/email-templates/components.ts";
import { EMAIL_SENDERS, getEmailHeaders } from "../_shared/email-config.ts";
import { sendEmail } from '../_shared/resend-client.ts';
import { z, parseBody, uuidSchema, emailSchema } from '../_shared/validation.ts';
import { sanitizeForEmail } from '../_shared/sanitize.ts';

const requestSchema = z.object({
  requestId: uuidSchema,
  name: z.string().min(1).max(200).trim(),
  email: emailSchema,
  type: z.string().max(100).optional(),
  company: z.string().max(300).trim().optional(),
  industry: z.string().max(200).trim().optional(),
  companySize: z.string().max(100).optional(),
  timeline: z.string().max(200).optional(),
  budget: z.string().max(200).optional(),
  rolesPerYear: z.string().max(100).optional(),
  website: z.string().max(500).optional(),
  location: z.string().max(300).optional(),
  phone: z.string().max(50).optional(),
});

Deno.serve(createHandler(async (req, ctx) => {
  const { supabase } = ctx;

  const parsed = await parseBody(req, requestSchema, ctx.corsHeaders);
  if ('error' in parsed) return parsed.error;
  const { requestId, name: rawName, email, type, company, industry, companySize, timeline, budget, rolesPerYear, website, location, phone } = parsed.data;

  // Sanitize user-supplied fields for HTML embedding
  const name = sanitizeForEmail(rawName);
  const safeCompany = sanitizeForEmail(company);
  const safeIndustry = sanitizeForEmail(industry);
  const safeCompanySize = sanitizeForEmail(companySize);
  const safeTimeline = sanitizeForEmail(timeline);
  const safeBudget = sanitizeForEmail(budget);
  const safeRolesPerYear = sanitizeForEmail(rolesPerYear);
  const safeWebsite = sanitizeForEmail(website);
  const safeLocation = sanitizeForEmail(location);
  const safePhone = sanitizeForEmail(phone);
  const safeType = sanitizeForEmail(type);

  // Get admin users to notify
  const { data: adminRoles } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin')
    .limit(10);

  if (!adminRoles?.length) {
    console.warn('[notify-admin-partner-request] No admin users found to notify');
    return new Response(JSON.stringify({ success: true, notified: 0 }), {
      headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' }
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
    title: `New ${safeType || 'partner'} request from ${name}`,
    message: `${name} (${email})${safeCompany ? ` from ${safeCompany}` : ''}${safeIndustry ? ` · ${safeIndustry}` : ''} submitted a membership request.${safeTimeline ? ` Timeline: ${safeTimeline}.` : ''} Review in the admin panel.`,
    action_url: '/admin/members',
    metadata: { request_id: requestId },
    is_read: false,
  }));

  const { error: notifError } = await supabase
    .from('notifications')
    .insert(notifications);

  if (notifError) {
    console.error('[notify-admin-partner-request] Failed to create notifications:', notifError);
  }

  // Send email notification to admins via Resend
  let emailsSent = 0;
  if (adminEmails.length > 0) {
    const appUrl = getAppUrl();
    const reviewUrl = `${appUrl}/admin/members`;

    const emailContent = `
      ${AlertBox({ type: 'warning', title: 'New Request Requires Review', message: `A new ${safeType || 'partner'} membership request has been submitted and is awaiting your review.` })}
      ${Heading({ text: `New ${safeType || 'Partner'} Request`, level: 1 })}
      ${Spacer(24)}
      ${Card({
        variant: 'default',
        content: `
          ${InfoRow({ icon: '👤', label: 'Name', value: name })}
          ${InfoRow({ icon: '📧', label: 'Email', value: email })}
          ${InfoRow({ icon: '🏷️', label: 'Type', value: (safeType || 'partner').charAt(0).toUpperCase() + (safeType || 'partner').slice(1) })}
          ${safeCompany ? InfoRow({ icon: '🏢', label: 'Company', value: safeCompany }) : ''}
          ${safeIndustry ? InfoRow({ icon: '🏭', label: 'Industry', value: safeIndustry }) : ''}
          ${safeCompanySize ? InfoRow({ icon: '👥', label: 'Company Size', value: safeCompanySize }) : ''}
          ${safeTimeline ? InfoRow({ icon: '📅', label: 'Timeline', value: safeTimeline }) : ''}
          ${safeBudget ? InfoRow({ icon: '💰', label: 'Budget', value: safeBudget }) : ''}
          ${safeRolesPerYear ? InfoRow({ icon: '🎯', label: 'Roles/Year', value: safeRolesPerYear }) : ''}
          ${safeWebsite ? InfoRow({ icon: '🌐', label: 'Website', value: safeWebsite }) : ''}
          ${safeLocation ? InfoRow({ icon: '📍', label: 'Location', value: safeLocation }) : ''}
          ${safePhone ? InfoRow({ icon: '📞', label: 'Phone', value: safePhone }) : ''}
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
      preheader: `New ${safeType || 'partner'} request from ${name} — review required`,
      content: emailContent,
      showHeader: true,
      showFooter: false,
    });

    try {
      const resendData = await sendEmail({
        from: EMAIL_SENDERS.notifications,
        to: adminEmails,
        subject: `New ${safeType || 'partner'} request: ${name}`,
        html: emailHtml,
        headers: getEmailHeaders(),
      });
      console.log('[notify-admin-partner-request] Admin notification email sent, Resend ID:', resendData.id);
      emailsSent = adminEmails.length;
    } catch (emailErr) {
      console.error('[notify-admin-partner-request] Email send error:', emailErr);
    }
  }

  return new Response(JSON.stringify({
    success: true,
    notified: adminIds.length,
    emails_sent: emailsSent,
  }), {
    headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' }
  });
}));
