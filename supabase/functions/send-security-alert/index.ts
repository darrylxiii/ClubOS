import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { Resend } from 'https://esm.sh/resend@2.0.0';
import { baseEmailTemplate } from "../_shared/email-templates/base-template.ts";
import { Heading, Paragraph, Spacer, Card, AlertBox, InfoRow } from "../_shared/email-templates/components.ts";
import { EMAIL_SENDERS, EMAIL_COLORS, getEmailAppUrl } from "../_shared/email-config.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Map severity to AlertBox type
    const alertTypeMap: Record<string, 'info' | 'success' | 'warning' | 'error'> = {
      low: 'info',
      medium: 'warning',
      high: 'warning',
      critical: 'error'
    };

    const severityEmoji: Record<string, string> = {
      low: 'ℹ️',
      medium: '⚠️',
      high: '🔶',
      critical: '🚨'
    };

    const appUrl = getEmailAppUrl();

    // Build actions list
    const actionsHtml = body.actions_taken?.length 
      ? `<ul style="margin: 8px 0 0 0; padding-left: 20px;">${body.actions_taken.map(a => `<li style="margin-bottom: 4px;">${a}</li>`).join('')}</ul>`
      : '';

    // Build email content
    const emailContent = `
      ${AlertBox({
        type: alertTypeMap[body.severity],
        title: `${severityEmoji[body.severity]} Security Alert - ${body.severity.toUpperCase()}`,
        message: body.threat_type,
      })}
      
      ${Spacer(24)}
      
      ${Card({
        variant: 'default',
        content: `
          ${InfoRow({ icon: '🔍', label: 'Threat Type', value: body.threat_type })}
          ${body.ip_address ? InfoRow({ icon: '🌐', label: 'IP Address', value: body.ip_address }) : ''}
          ${InfoRow({ icon: '🕐', label: 'Time', value: new Date().toISOString() })}
          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: ${EMAIL_COLORS.ivory};">Details:</p>
            <p style="margin: 0; color: ${EMAIL_COLORS.textSecondary};">${body.details}</p>
          </div>
          ${body.actions_taken?.length ? `
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
              <p style="margin: 0 0 8px 0; font-weight: 600; color: ${EMAIL_COLORS.ivory};">Actions Taken:</p>
              ${actionsHtml}
            </div>
          ` : ''}
        `
      })}
      
      ${Spacer(24)}
      ${Paragraph(`Review the threat in the <a href="${appUrl}/admin/anti-hacking" style="color: ${EMAIL_COLORS.gold}; text-decoration: none;">Security Dashboard</a>.`, 'secondary')}
      ${Spacer(16)}
      ${Paragraph('This is an automated security alert from The Quantum Club platform.', 'muted')}
    `;

    const htmlContent = baseEmailTemplate({
      preheader: `[${body.severity.toUpperCase()}] Security Alert: ${body.threat_type}`,
      content: emailContent,
      showHeader: true,
      showFooter: true,
    });

    // Send email
    const emailResult = await resend.emails.send({
      from: EMAIL_SENDERS.security,
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
