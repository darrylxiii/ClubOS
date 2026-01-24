import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { 
  Heading, Paragraph, Spacer, Card, Button, StatusBadge 
} from "../_shared/email-templates/components.ts";
import { EMAIL_SENDERS, EMAIL_COLORS, getEmailAppUrl } from "../_shared/email-config.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { recordingId } = await req.json();
    
    if (!recordingId) {
      throw new Error('recordingId is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch recording with analysis
    const { data: recording, error: recordingError } = await supabase
      .from('meeting_recordings_extended')
      .select('*')
      .eq('id', recordingId)
      .single();

    if (recordingError) throw recordingError;

    if (!recording.ai_summary) {
      console.log('No analysis available yet for recording:', recordingId);
      return new Response(
        JSON.stringify({ success: false, message: 'Analysis not ready' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get host email
    const { data: hostProfile } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', recording.host_id)
      .single();

    if (!hostProfile?.email) {
      console.log('No host email found for recording:', recordingId);
      return new Response(
        JSON.stringify({ success: false, message: 'No host email' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
    const getPriorityLabel = (priority: string) => {
      if (priority === 'urgent') return `<span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; background: #fef2f2; color: #dc2626;">urgent</span>`;
      if (priority === 'high') return `<span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; background: #fff7ed; color: #ea580c;">high</span>`;
      return `<span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; background: #f3f4f6; color: #374151;">normal</span>`;
    };
    
    const actionItemsHtml = actionItems.slice(0, 5).map((item: any) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.1);">
          ${getPriorityLabel(item.priority)}
        </td>
        <td style="padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.1); color: ${EMAIL_COLORS.ivory};">${item.task}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.1); color: ${EMAIL_COLORS.textMuted};">${item.owner}</td>
      </tr>
    `).join('');

    // Build key moments HTML
    const keyMoments = analysis.keyMoments?.slice(0, 3) || [];
    const keyMomentsHtml = keyMoments.map((moment: any) => `
      <div style="padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; margin-bottom: 8px;">
        <div style="margin-bottom: 4px;">
          <span style="font-weight: 600; color: ${EMAIL_COLORS.ivory};">${moment.type.replace('_', ' ')}</span>
          <span style="color: ${EMAIL_COLORS.textMuted}; font-size: 12px; margin-left: 8px;">@${moment.timestamp}</span>
        </div>
        <p style="margin: 0; color: ${EMAIL_COLORS.textSecondary}; font-size: 14px;">${moment.description}</p>
      </div>
    `).join('');

    // Build email content
    const emailContent = `
      ${Heading({ text: '📊 Meeting Summary', level: 1 })}
      ${Spacer(8)}
      ${Paragraph('Powered by Club AI', 'muted')}
      ${Spacer(24)}
      
      ${Paragraph(`Hi ${hostProfile.first_name || 'there'},`, 'primary')}
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
                <p style="margin: 0 0 4px 0; color: ${EMAIL_COLORS.textMuted}; font-size: 12px;">Overall Fit</p>
                <p style="margin: 0; font-size: 20px; font-weight: bold; text-transform: capitalize; color: ${EMAIL_COLORS.gold};">
                  ${analysis.candidateEvaluation?.overallFit || 'pending'}
                </p>
              `
            })}
          </td>
          <td width="50%" style="padding-left: 8px;">
            ${Card({
              variant: 'default',
              content: `
                <p style="margin: 0 0 4px 0; color: ${EMAIL_COLORS.textMuted}; font-size: 12px;">Recommendation</p>
                <p style="margin: 0; font-size: 20px; font-weight: bold; text-transform: capitalize; color: ${EMAIL_COLORS.gold};">
                  ${(analysis.decisionGuidance?.recommendation || 'pending').replace('_', ' ')}
                </p>
              `
            })}
          </td>
        </tr>
      </table>
      
      <!-- Executive Summary -->
      ${Card({
        variant: 'highlight',
        content: `
          <h3 style="margin: 0 0 8px 0; color: ${EMAIL_COLORS.gold}; font-size: 14px;">Executive Summary</h3>
          <p style="margin: 0; color: ${EMAIL_COLORS.ivory}; font-size: 14px; line-height: 1.6;">
            ${analysis.executiveSummary || 'Analysis pending'}
          </p>
        `
      })}
      
      ${actionItems.length > 0 ? `
        ${Spacer(24)}
        <h3 style="margin: 0 0 12px 0; color: ${EMAIL_COLORS.ivory}; font-size: 16px;">📋 Action Items</h3>
        <table width="100%" style="border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background: rgba(255,255,255,0.05);">
              <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid rgba(255,255,255,0.1); color: ${EMAIL_COLORS.textSecondary};">Priority</th>
              <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid rgba(255,255,255,0.1); color: ${EMAIL_COLORS.textSecondary};">Task</th>
              <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid rgba(255,255,255,0.1); color: ${EMAIL_COLORS.textSecondary};">Owner</th>
            </tr>
          </thead>
          <tbody>
            ${actionItemsHtml}
          </tbody>
        </table>
      ` : ''}
      
      ${keyMoments.length > 0 ? `
        ${Spacer(24)}
        <h3 style="margin: 0 0 12px 0; color: ${EMAIL_COLORS.ivory}; font-size: 16px;">⭐ Key Moments</h3>
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

    // If Resend API key is configured, send email
    if (resendApiKey) {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: EMAIL_SENDERS.clubAI,
          to: hostProfile.email,
          subject: `📊 Meeting Summary: ${recording.title || 'Your Recording'}`,
          html: htmlContent,
        }),
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error('Resend error:', errorText);
        throw new Error(`Failed to send email: ${errorText}`);
      }

      console.log('✅ Summary email sent to:', hostProfile.email);

      // Log the notification
      await supabase.from('notifications').insert({
        user_id: recording.host_id,
        type: 'meeting_summary',
        title: 'Meeting Summary Ready',
        message: `AI analysis complete for: ${recording.title || 'your recording'}`,
        data: { recording_id: recordingId },
        is_read: false
      });

      return new Response(
        JSON.stringify({ success: true, message: 'Email sent' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Log for development
      console.log('📧 Email would be sent (RESEND_API_KEY not configured):', {
        to: hostProfile.email,
        subject: `Meeting Summary: ${recording.title}`,
      });

      return new Response(
        JSON.stringify({ success: true, message: 'Email prepared (not sent - no API key)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('❌ Error sending summary email:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
