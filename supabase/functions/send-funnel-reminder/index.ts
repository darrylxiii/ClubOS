import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { sendEmail } from '../_shared/resend-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, contactName, companyName, resumeUrl, isSecondReminder } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const name = contactName || 'there';
    const company = companyName ? ` for ${companyName}` : '';

    // Differentiate copy for first vs second reminder
    const subject = isSecondReminder
      ? `Your saved progress expires soon, ${name}`
      : `Your brief is saved, ${name}`;

    const bodyParagraph = isSecondReminder
      ? `Your saved progress will be removed soon. Complete your hiring brief${company} now — it takes less than two minutes.`
      : `You began a hiring brief${company}. Your progress is saved — it takes less than two minutes to complete.`;

    const ctaText = isSecondReminder ? 'Complete Now' : 'Resume your brief';

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;">
        <tr><td style="padding:0 0 32px 0;text-align:center;">
          <p style="font-size:18px;font-weight:700;color:#0E0E10;margin:0;">The Quantum Club</p>
        </td></tr>
        <tr><td style="padding:32px;background-color:#f9f9f8;border-radius:12px;">
          <p style="font-size:16px;color:#0E0E10;margin:0 0 16px;">Hi ${name},</p>
          <p style="font-size:15px;color:#3d3d3d;line-height:1.6;margin:0 0 24px;">
            ${bodyParagraph}
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:8px 0 24px;">
              <a href="${resumeUrl}" style="display:inline-block;padding:14px 32px;background-color:#0E0E10;color:#F5F4EF;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">
                ${ctaText}
              </a>
            </td></tr>
          </table>
          <p style="font-size:14px;color:#666;line-height:1.5;margin:0;">
            No fees until you hire.
          </p>
        </td></tr>
        <tr><td style="padding:32px 0 0;text-align:center;">
          <p style="font-size:12px;color:#999;margin:0 0 8px;">
            The Quantum Club · Pieter Cornelisz. Hooftstraat 41-2, Amsterdam, The Netherlands
          </p>
          <p style="font-size:12px;color:#999;margin:0;">
            If you didn't start this request, you can safely ignore this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const plainText = `Hi ${name},

${bodyParagraph}

${ctaText}: ${resumeUrl}

No fees until you hire.

The Quantum Club
Pieter Cornelisz. Hooftstraat 41-2, Amsterdam, The Netherlands`;

    const result = await sendEmail({
      from: 'The Quantum Club <partners@thequantumclub.nl>',
      to: [email],
      subject,
      html: htmlBody,
      text: plainText,
      headers: {
        'List-Unsubscribe': '<mailto:unsubscribe@thequantumclub.nl>',
      },
    });

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error sending funnel reminder:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
