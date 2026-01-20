import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

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
    const appUrl = Deno.env.get('APP_URL') || 'https://app.thequantumclub.com';
    const recordingUrl = `${appUrl}/recording/${recordingId}`;

    // Generate email HTML
    const emailHtml = generateSummaryEmailHtml({
      hostName: hostProfile.first_name || 'there',
      meetingTitle: recording.title || 'Meeting Recording',
      duration: Math.round(recording.duration_seconds / 60),
      executiveSummary: analysis.executiveSummary || 'Analysis pending',
      recommendation: analysis.decisionGuidance?.recommendation || 'pending',
      overallFit: analysis.candidateEvaluation?.overallFit || 'pending',
      actionItems: analysis.actionItems || [],
      keyMoments: analysis.keyMoments?.slice(0, 3) || [],
      recordingUrl,
      appUrl
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
          from: 'Club AI <notifications@thequantumclub.com>',
          to: hostProfile.email,
          subject: `📊 Meeting Summary: ${recording.title || 'Your Recording'}`,
          html: emailHtml,
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

interface SummaryEmailData {
  hostName: string;
  meetingTitle: string;
  duration: number;
  executiveSummary: string;
  recommendation: string;
  overallFit: string;
  actionItems: Array<{ task: string; owner: string; priority: string }>;
  keyMoments: Array<{ type: string; description: string; timestamp: string }>;
  recordingUrl: string;
  appUrl: string;
}

function generateSummaryEmailHtml(data: SummaryEmailData): string {
  const getRecommendationColor = (rec: string) => {
    if (rec.includes('yes')) return '#22c55e';
    if (rec.includes('no')) return '#ef4444';
    return '#eab308';
  };

  const getFitColor = (fit: string) => {
    switch (fit) {
      case 'excellent': return '#22c55e';
      case 'good': return '#3b82f6';
      case 'fair': return '#eab308';
      case 'poor': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const actionItemsHtml = data.actionItems.slice(0, 5).map(item => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">
        <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; background: ${item.priority === 'urgent' ? '#fef2f2' : item.priority === 'high' ? '#fff7ed' : '#f3f4f6'}; color: ${item.priority === 'urgent' ? '#dc2626' : item.priority === 'high' ? '#ea580c' : '#374151'};">${item.priority}</span>
      </td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${item.task}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${item.owner}</td>
    </tr>
  `).join('');

  const keyMomentsHtml = data.keyMoments.map(moment => `
    <div style="padding: 12px; background: #f9fafb; border-radius: 8px; margin-bottom: 8px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
        <span style="font-weight: 600; color: #374151;">${moment.type.replace('_', ' ')}</span>
        <span style="color: #9ca3af; font-size: 12px;">@${moment.timestamp}</span>
      </div>
      <p style="margin: 0; color: #6b7280; font-size: 14px;">${moment.description}</p>
    </div>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meeting Summary</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0E0E10, #1a1a1d); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
      <h1 style="color: #C9A24E; margin: 0 0 8px 0; font-size: 24px;">📊 Meeting Summary</h1>
      <p style="color: #e5e7eb; margin: 0; font-size: 14px;">Powered by Club AI</p>
    </div>

    <!-- Content -->
    <div style="background: white; padding: 32px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <p style="color: #374151; margin: 0 0 24px 0;">Hi ${data.hostName},</p>
      
      <p style="color: #6b7280; margin: 0 0 24px 0;">
        Your meeting recording <strong>"${data.meetingTitle}"</strong> (${data.duration} min) has been analyzed. Here's your AI-powered summary:
      </p>

      <!-- Quick Stats -->
      <div style="display: flex; gap: 16px; margin-bottom: 24px;">
        <div style="flex: 1; background: #f9fafb; padding: 16px; border-radius: 8px; text-align: center;">
          <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px;">Overall Fit</p>
          <p style="margin: 0; font-size: 20px; font-weight: bold; color: ${getFitColor(data.overallFit)}; text-transform: capitalize;">${data.overallFit}</p>
        </div>
        <div style="flex: 1; background: #f9fafb; padding: 16px; border-radius: 8px; text-align: center;">
          <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px;">Recommendation</p>
          <p style="margin: 0; font-size: 20px; font-weight: bold; color: ${getRecommendationColor(data.recommendation)}; text-transform: capitalize;">${data.recommendation.replace('_', ' ')}</p>
        </div>
      </div>

      <!-- Executive Summary -->
      <div style="background: #fffbeb; border-left: 4px solid #C9A24E; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 8px 0; color: #92400e; font-size: 14px;">Executive Summary</h3>
        <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">${data.executiveSummary}</p>
      </div>

      <!-- Action Items -->
      ${data.actionItems.length > 0 ? `
      <div style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px 0; color: #374151; font-size: 16px;">📋 Action Items</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background: #f9fafb;">
              <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Priority</th>
              <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Task</th>
              <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Owner</th>
            </tr>
          </thead>
          <tbody>
            ${actionItemsHtml}
          </tbody>
        </table>
      </div>
      ` : ''}

      <!-- Key Moments -->
      ${data.keyMoments.length > 0 ? `
      <div style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px 0; color: #374151; font-size: 16px;">⭐ Key Moments</h3>
        ${keyMomentsHtml}
      </div>
      ` : ''}

      <!-- CTA -->
      <div style="text-align: center; margin-top: 32px;">
        <a href="${data.recordingUrl}" style="display: inline-block; background: linear-gradient(135deg, #C9A24E, #b8924a); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          View Full Analysis →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 24px; color: #9ca3af; font-size: 12px;">
      <p style="margin: 0 0 8px 0;">The Quantum Club</p>
      <p style="margin: 0;">
        <a href="${data.appUrl}/settings?tab=notifications" style="color: #6b7280;">Notification preferences</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
