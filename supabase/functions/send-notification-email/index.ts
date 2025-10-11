import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { notification_id } = await req.json();

    // Get notification details
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .select('*, profiles!notifications_user_id_fkey(email, full_name)')
      .eq('id', notification_id)
      .single();

    if (notifError || !notification) {
      throw new Error('Notification not found');
    }

    // Check user notification preferences
    const { data: prefs, error: prefsError } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', notification.user_id)
      .single();

    if (prefsError && prefsError.code !== 'PGRST116') {
      throw new Error('Failed to load preferences');
    }

    // Check if email notifications are enabled
    if (!prefs || !prefs.email_enabled) {
      console.log('Email notifications disabled for user');
      return new Response(
        JSON.stringify({ success: false, reason: 'Email notifications disabled' }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check type-specific preferences
    const typePrefs: Record<string, boolean> = {
      'application': prefs.email_applications,
      'message': prefs.email_messages,
      'interview': prefs.email_interviews,
      'job_match': prefs.email_job_matches,
      'system': prefs.email_system,
    };

    if (!typePrefs[notification.type]) {
      console.log(`Email notifications disabled for type: ${notification.type}`);
      return new Response(
        JSON.stringify({ success: false, reason: `Email disabled for ${notification.type}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check quiet hours
    if (prefs.quiet_hours_enabled && prefs.quiet_hours_start && prefs.quiet_hours_end) {
      const now = new Date();
      const userTz = prefs.quiet_hours_timezone || 'Europe/Amsterdam';
      const currentTime = now.toLocaleTimeString('en-US', { 
        timeZone: userTz, 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      const startTime = prefs.quiet_hours_start;
      const endTime = prefs.quiet_hours_end;

      // Simple time comparison (doesn't handle cross-midnight properly, but good enough)
      if (currentTime >= startTime || currentTime <= endTime) {
        console.log('In quiet hours, skipping email');
        return new Response(
          JSON.stringify({ success: false, reason: 'Quiet hours active' }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const userEmail = notification.profiles?.email;
    const userName = notification.profiles?.full_name || 'Member';

    if (!userEmail) {
      throw new Error('User email not found');
    }

    // Determine category color
    const getCategoryColor = (category: string) => {
      switch (category) {
        case 'success': return '#10b981';
        case 'warning': return '#f59e0b';
        case 'error': return '#ef4444';
        default: return '#C9A24E';
      }
    };

    const categoryColor = getCategoryColor(notification.category);

    // Build action button if URL provided
    const actionButton = notification.action_url ? `
      <a href="${notification.action_url}" 
         style="display: inline-block; background: linear-gradient(135deg, #C9A24E 0%, #b8944a 100%); color: #0E0E10; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: 600; margin: 20px 0;">
        ${notification.action_label || 'View Details'}
      </a>
    ` : '';

    // Send email via Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "The Quantum Club <notifications@thequantumclub.nl>",
        to: [userEmail],
        subject: notification.title,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: linear-gradient(135deg, #0E0E10 0%, #1a1a1f 100%); margin: 0; padding: 40px 20px; }
              .container { max-width: 600px; margin: 0 auto; background: rgba(255, 255, 255, 0.02); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; padding: 40px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5); }
              .logo-text { font-size: 24px; font-weight: 700; background: linear-gradient(135deg, #C9A24E 0%, #F5F4EF 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: -0.5px; text-align: center; margin-bottom: 32px; }
              .category-badge { display: inline-block; background: ${categoryColor}20; color: ${categoryColor}; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; }
              h1 { color: #F5F4EF; font-size: 22px; font-weight: 600; margin: 0 0 16px 0; }
              p { color: rgba(245, 244, 239, 0.8); font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; }
              .footer { margin-top: 40px; padding-top: 32px; border-top: 1px solid rgba(255, 255, 255, 0.1); text-align: center; }
              .footer p { font-size: 13px; color: rgba(245, 244, 239, 0.5); margin-bottom: 8px; }
              a { color: #C9A24E; text-decoration: none; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="logo-text">✦ THE QUANTUM CLUB</div>
              
              <span class="category-badge">${notification.type}</span>
              <h1>${notification.title}</h1>
              <p>${notification.message}</p>
              
              ${actionButton}
              
              <div class="footer">
                <p>The Quantum Club - Exclusive Talent Network</p>
                <p>
                  <a href="https://thequantumclub.app/settings#notifications">Manage notification preferences</a> | 
                  <a href="mailto:support@thequantumclub.nl">Contact support</a>
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(`Resend API error: ${errorText}`);
    }

    const result = await emailResponse.json();
    console.log("Notification email sent successfully:", result);

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent', email_id: result.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending notification email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
