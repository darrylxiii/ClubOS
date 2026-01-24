import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { Heading, Paragraph, Spacer, Card, AlertBox } from "../_shared/email-templates/components.ts";
import { EMAIL_SENDERS } from "../_shared/email-config.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestEmailRequest {
  templateKey: string;
  testEmail: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { templateKey, testEmail }: TestEmailRequest = await req.json();

    console.log('[send-test-email] Sending test for:', { templateKey, testEmail });

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch template from database
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_key', templateKey)
      .single();

    if (templateError || !template) {
      throw new Error(`Template not found: ${templateKey}`);
    }

    // Generate sample data for variables
    const sampleData: Record<string, string> = {
      fullName: 'John Doe',
      email: testEmail,
      requestType: 'candidate',
      declineReason: 'Sample decline reason for testing',
      guestName: 'John Doe',
      scheduledStart: new Date().toLocaleString(),
      meetingLink: 'https://meet.example.com/test-meeting',
    };

    // Build email content using template components
    const contentData = template.content_template;
    const steps = contentData.candidateNextSteps || contentData.partnerNextSteps || [];
    const stepsHtml = steps.length > 0 
      ? `<ul style="margin: 10px 0 0 0; padding-left: 20px;">${steps.map((step: string) => `<li style="margin-bottom: 8px;">${step}</li>`).join('')}</ul>`
      : '';

    const emailContent = `
      ${AlertBox({
        type: 'warning',
        title: '🧪 Test Email',
        message: `This is a test of the "${template.name}" template`,
      })}
      ${Spacer(24)}
      ${Heading({ text: contentData.heading || template.name, level: 1 })}
      ${Spacer(16)}
      ${Paragraph(`Dear ${sampleData.fullName},`, 'primary')}
      ${Spacer(8)}
      ${Paragraph(contentData.intro || 'Email content goes here', 'secondary')}
      ${stepsHtml ? `
        ${Spacer(24)}
        ${Card({
          variant: 'highlight',
          content: `
            <p style="margin: 0 0 8px 0;"><strong>What's Next:</strong></p>
            ${stepsHtml}
          `
        })}
      ` : ''}
      ${contentData.showReason ? `
        ${Spacer(16)}
        ${Paragraph(`<strong>Reason:</strong> ${sampleData.declineReason}`, 'muted')}
      ` : ''}
      ${Spacer(32)}
      ${Paragraph('Best regards,<br>The Quantum Club Team', 'secondary')}
    `;

    const htmlContent = baseEmailTemplate({
      preheader: `[TEST] ${template.subject_template}`,
      content: emailContent,
      showHeader: true,
      showFooter: true,
    });

    // Send via Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_SENDERS.system,
        to: [testEmail],
        subject: `[TEST] ${template.subject_template}`,
        html: htmlContent,
      }),
    });

    const emailData = await emailResponse.json();

    console.log('[send-test-email] Sent successfully:', emailData);

    return new Response(
      JSON.stringify({ success: true, messageId: emailData.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('[send-test-email] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
