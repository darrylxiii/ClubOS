import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { publicCorsHeaders as corsHeaders } from "../_shared/cors-config.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    // Build email content using template
    const contentData = template.content_template;
    const steps = contentData.candidateNextSteps || contentData.partnerNextSteps || [];
    const stepsHtml = steps.map((step: string) => `<li>${step}</li>`).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0E0E10 0%, #1a1a1d 100%); color: #F5F4EF; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #fff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #C9A24E; color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; }
            .highlight { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .test-banner { background: #fef3c7; border: 2px solid #f59e0b; padding: 12px; text-align: center; font-weight: 600; color: #92400e; }
          </style>
        </head>
        <body>
          <div class="test-banner">
            🧪 TEST EMAIL - Template: ${template.name}
          </div>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 32px;">${contentData.heading || template.name}</h1>
            </div>
            <div class="content">
              <p>Dear ${sampleData.fullName},</p>
              <p>${contentData.intro || 'Email content goes here'}</p>
              
              ${stepsHtml ? `
                <div class="highlight">
                  <p style="margin: 0;"><strong>What's Next:</strong></p>
                  <ul style="margin: 10px 0 0 0; padding-left: 20px;">${stepsHtml}</ul>
                </div>
              ` : ''}
              
              ${contentData.ctaText ? `
                <div style="text-align: center;">
                  <a href="${contentData.ctaUrl || '#'}" class="button">
                    ${contentData.ctaText}
                  </a>
                </div>
              ` : ''}
              
              ${contentData.showReason ? `
                <p style="color: #999; margin-top: 20px;">
                  <strong>Reason:</strong> ${sampleData.declineReason}
                </p>
              ` : ''}
              
              <p style="margin-top: 30px;">Best regards,<br>The Quantum Club Team</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send via Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "The Quantum Club <onboarding@resend.dev>",
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
