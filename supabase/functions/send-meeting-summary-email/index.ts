import { createHandler } from '../_shared/handler.ts';
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import {
  Heading, Paragraph, Spacer, Card, Button, StatusBadge, InfoRow, AlertBox
} from "../_shared/email-templates/components.ts";
import { EMAIL_SENDERS, EMAIL_COLORS, getEmailAppUrl } from "../_shared/email-config.ts";
import { sendEmail } from '../_shared/resend-client.ts';
import { z, parseBody, uuidSchema } from '../_shared/validation.ts';
import { sanitizeForEmail } from '../_shared/sanitize.ts';

const summaryBodySchema = z.object({
  recordingId: uuidSchema,
});

Deno.serve(createHandler(async (req, ctx) => {
  const parsed = await parseBody(req, summaryBodySchema, ctx.corsHeaders);
  if ('error' in parsed) return parsed.error;
  const { recordingId } = parsed.data;

    // Fetch recording with analysis
    const { data: recording, error: recordingError } = await ctx.supabase
      .from('meeting_recordings_extended')
      .select('*')
      .eq('id', recordingId)
      .single();

    if (recordingError) throw recordingError;

    if (!recording.ai_summary) {
      console.log('[send-meeting-summary-email] No analysis available yet for recording:', recordingId);
      return new Response(
        JSON.stringify({ success: false, message: 'Analysis not ready' }),
        { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get host email
    const { data: hostProfile } = await ctx.supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', recording.host_id)
      .single();

    if (!hostProfile?.email) {
      console.log('[send-meeting-summary-email] No host email found for recording:', recordingId);
      return new Response(
        JSON.stringify({ success: false, message: 'No host email' }),
        { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const analysis = recording.ai_summary;
    const appUrl = getEmailAppUrl();
    const recordingUrl = `${appUrl}/recording/${recordingId}`;
    const duration = Math.round(recording.duration_seconds / 60);

    // Generate status colors
    const getRecommendationStatus = (rec: string) => {
      if (rec.includes('yes')) return 'confirmed';
      if (rec.includes('no')) return 'declined';
      return 'pending';
    };

    // Build action items HTML
    const actionItems = analysis.actionItems || [];
    const getPriorityVariant = (priority: string): 'error' | 'warning' | 'info' => {
      if (priority === 'urgent') return 'error';
      if (priority === 'high') return 'warning';
      return 'info';
    };

    const actionItemsHtml = actionItems.slice(0, 5).map((item: any) =>
      Card({
        variant: getPriorityVariant(item.priority) === 'error' ? 'warning' : 'default',
        content: `
          ${AlertBox({ type: getPriorityVariant(item.priority), message: item.priority })}
          ${Spacer(8)}
          ${InfoRow({ label: 'Task', value: item.task })}
          ${InfoRow({ label: 'Owner', value: item.owner })}
        `
      })
    ).join(Spacer(8));

    // Build key moments HTML
    const keyMoments = analysis.keyMoments?.slice(0, 3) || [];
    const keyMomentsHtml = keyMoments.map((moment: any) =>
      Card({
        variant: 'default',
        content: `
          ${InfoRow({ label: moment.type.replace('_', ' '), value: `@${moment.timestamp}` })}
          ${Paragraph(moment.description, 'secondary')}
        `
      })
    ).join(Spacer(8));

    // Build email content
    const emailContent = `
      ${Heading({ text: 'Meeting Summary', level: 1 })}
      ${Spacer(8)}
      ${Paragraph('Powered by Club AI', 'muted')}
      ${Spacer(24)}
      
      ${Paragraph(`Hi ${sanitizeForEmail(hostProfile.first_name) || 'there'},`, 'primary')}
      ${Spacer(8)}
      ${Paragraph(`Your meeting recording <strong>"${recording.title || 'Meeting Recording'}"</strong> (${duration} min) has been analyzed. Here's your AI-powered summary:`, 'secondary')}
      ${Spacer(24)}
      
      <!-- Quick Stats -->
      <table role="presentation" width="100%" style="margin-bottom: 24px;">
        <tr>
          <td width="50%" style="padding-right: 8px;">
            ${Card({
              variant: 'default',
              content: `
                ${Paragraph('Overall Fit', 'muted')}
                ${Heading({ text: analysis.candidateEvaluation?.overallFit || 'pending', level: 2 })}
              `
            })}
          </td>
          <td width="50%" style="padding-left: 8px;">
            ${Card({
              variant: 'default',
              content: `
                ${Paragraph('Recommendation', 'muted')}
                ${Heading({ text: (analysis.decisionGuidance?.recommendation || 'pending').replace('_', ' '), level: 2 })}
              `
            })}
          </td>
        </tr>
      </table>
      
      <!-- Executive Summary -->
      ${Card({
        variant: 'highlight',
        content: `
          ${Heading({ text: 'Executive Summary', level: 3 })}
          ${Paragraph(analysis.executiveSummary || 'Analysis pending', 'primary')}
        `
      })}
      
      ${actionItems.length > 0 ? `
        ${Spacer(24)}
        ${Heading({ text: 'Action Items', level: 3 })}
        ${actionItemsHtml}
      ` : ''}
      
      ${keyMoments.length > 0 ? `
        ${Spacer(24)}
        ${Heading({ text: 'Key Moments', level: 3 })}
        ${keyMomentsHtml}
      ` : ''}
      
      ${Spacer(32)}
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td align="center">
            ${Button({ url: recordingUrl, text: 'View Full Analysis →', variant: 'primary' })}
          </td>
        </tr>
      </table>
    `;

    const htmlContent = baseEmailTemplate({
      preheader: `AI analysis complete for: ${recording.title || 'your recording'}`,
      content: emailContent,
      showHeader: true,
      showFooter: true,
    });

    // Send email via shared Resend client
    await sendEmail({
      from: EMAIL_SENDERS.clubAI,
      to: hostProfile.email,
      subject: `Meeting Summary: ${recording.title || 'Your Recording'}`,
      html: htmlContent,
    });

    console.log('[send-meeting-summary-email] Summary email sent to:', hostProfile.email);

    // Log the notification
    await ctx.supabase.from('notifications').insert({
      user_id: recording.host_id,
      type: 'meeting_summary',
      title: 'Meeting Summary Ready',
      message: `AI analysis complete for: ${recording.title || 'your recording'}`,
      data: { recording_id: recordingId },
      is_read: false
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent' }),
      { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
    );
}));
