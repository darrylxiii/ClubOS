import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { Resend } from 'https://esm.sh/resend@2.0.0';
import { publicCorsHeaders as corsHeaders } from "../_shared/cors-config.ts";

interface SecurityAlertRequest {
  threat_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  ip_address?: string;
  details: string;
  actions_taken?: string[];
  threat_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body: SecurityAlertRequest = await req.json();
    console.log('[send-security-alert] Received alert request:', body);

    // Get alert configuration
    const { data: alertConfig } = await supabase
      .from('security_config')
      .select('config_value')
      .eq('config_key', 'alert_on_critical')
      .single();

    if (!alertConfig?.config_value) {
      console.log('[send-security-alert] No alert configuration found');
      return new Response(
        JSON.stringify({ success: false, message: 'No alert configuration found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const config = alertConfig.config_value as { enabled: boolean; email: string };
    
    if (!config.enabled) {
      console.log('[send-security-alert] Alerts are disabled');
      return new Response(
        JSON.stringify({ success: false, message: 'Alerts are disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!config.email) {
      console.log('[send-security-alert] No alert email configured');
      return new Response(
        JSON.stringify({ success: false, message: 'No alert email configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('[send-security-alert] RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, message: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(resendApiKey);

    // Build email content
    const severityColors: Record<string, string> = {
      low: '#3b82f6',
      medium: '#eab308',
      high: '#f97316',
      critical: '#ef4444'
    };

    const severityEmoji: Record<string, string> = {
      low: 'ℹ️',
      medium: '⚠️',
      high: '🔶',
      critical: '🚨'
    };

    const actionsHtml = body.actions_taken?.length 
      ? `<h3>Actions Taken:</h3><ul>${body.actions_taken.map(a => `<li>${a}</li>`).join('')}</ul>`
      : '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${severityColors[body.severity]}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; }
          .severity-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; background: rgba(255,255,255,0.2); font-weight: 600; text-transform: uppercase; }
          .detail-row { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
          .label { font-weight: 600; color: #666; }
          h3 { margin-top: 20px; color: #333; }
          ul { margin: 10px 0; padding-left: 20px; }
          li { margin: 5px 0; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${severityEmoji[body.severity]} Security Alert</h1>
            <span class="severity-badge">${body.severity.toUpperCase()}</span>
          </div>
          <div class="content">
            <div class="detail-row">
              <span class="label">Threat Type:</span> ${body.threat_type}
            </div>
            ${body.ip_address ? `<div class="detail-row"><span class="label">IP Address:</span> ${body.ip_address}</div>` : ''}
            <div class="detail-row">
              <span class="label">Details:</span> ${body.details}
            </div>
            <div class="detail-row">
              <span class="label">Time:</span> ${new Date().toISOString()}
            </div>
            ${actionsHtml}
            <div class="footer">
              <p>This is an automated security alert from The Quantum Club platform.</p>
              <p>Review the threat in the <a href="${Deno.env.get('APP_URL') || 'https://app.thequantumclub.com'}/admin/anti-hacking">Security Dashboard</a>.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email
    const emailResult = await resend.emails.send({
      from: 'Security <security@thequantumclub.com>',
      to: [config.email],
      subject: `${severityEmoji[body.severity]} [${body.severity.toUpperCase()}] Security Alert: ${body.threat_type}`,
      html: htmlContent
    });

    console.log('[send-security-alert] Email sent:', emailResult);

    // Log the alert
    await supabase.from('auth_security_events').insert({
      event_type: 'security_alert_sent',
      email: config.email,
      ip_address: body.ip_address,
      metadata: {
        threat_type: body.threat_type,
        severity: body.severity,
        threat_id: body.threat_id,
        email_id: emailResult.data?.id
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Security alert sent',
        email_id: emailResult.data?.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[send-security-alert] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to send security alert', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
