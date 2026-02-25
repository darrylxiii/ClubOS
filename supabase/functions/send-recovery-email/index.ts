import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { Heading, Paragraph, Spacer, Card, Button, InfoRow } from "../_shared/email-templates/components.ts";
import { EMAIL_SENDERS, EMAIL_COLORS, getEmailAppUrl } from "../_shared/email-config.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { email, sessionId, step } = await req.json();

    if (!email || !sessionId) {
      throw new Error('Email and sessionId are required');
    }

    const appUrl = getEmailAppUrl();
    const recoveryLink = `${appUrl}/partner?recover=${sessionId}`;

    console.log(`[Recovery] Sending link to ${email} for session ${sessionId} at step ${step}`);

    // Store recovery request for audit
    await supabase.from('funnel_analytics').insert({
      session_id: sessionId,
      step_number: step,
      step_name: 'recovery_email_sent',
      action: 'email_sent',
      metadata: {
        email_to: email,
        recovery_link: recoveryLink,
        sent_at: new Date().toISOString(),
      },
    });

    // Send email via Resend
    if (resendApiKey) {
      const emailContent = `
        ${Heading({ text: 'Continue Your Application', level: 1 })}
        ${Spacer(16)}
        ${Paragraph('You started a partner application on The Quantum Club. Use the link below to pick up where you left off.', 'secondary')}
        ${Spacer(16)}
        ${Card({
          variant: 'highlight',
          content: `
            ${InfoRow({ icon: '📋', label: 'Session', value: sessionId.substring(0, 8) + '...' })}
            ${step ? InfoRow({ icon: '📍', label: 'Progress', value: `Step ${step}` }) : ''}
          `,
        })}
        ${Spacer(24)}
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td align="center">
              ${Button({ url: recoveryLink, text: 'Resume Application', variant: 'primary' })}
            </td>
          </tr>
        </table>
        ${Spacer(16)}
        ${Paragraph('This link will restore your progress. If you did not start this application, you can safely ignore this email.', 'muted')}
      `;

      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: EMAIL_SENDERS.partners,
          to: [email],
          subject: 'Resume Your Application — The Quantum Club',
          html: baseEmailTemplate({
            preheader: 'Pick up where you left off on your partner application',
            content: emailContent,
            showHeader: true,
            showFooter: true,
          }),
        }),
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error('[Recovery] Resend error:', errorText);
        throw new Error(`Failed to send recovery email: ${errorText}`);
      }

      const result = await emailResponse.json();
      console.log('[Recovery] Email sent:', result.id);

      return new Response(
        JSON.stringify({ success: true, message: 'Recovery email sent', emailId: result.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.warn('[Recovery] RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Email service not configured', recoveryLink }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in send-recovery-email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
