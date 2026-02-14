import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { getAppUrl } from "../_shared/app-config.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { requestId, name, email, type } = await req.json();

    if (!requestId || !name || !email) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get admin users to notify
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')
      .limit(10);

    if (!adminRoles?.length) {
      console.warn('No admin users found to notify');
      return new Response(JSON.stringify({ success: true, notified: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const adminIds = adminRoles.map(r => r.user_id);

    // Get admin emails
    const { data: adminProfiles } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', adminIds);

    const adminEmails = adminProfiles?.map(p => p.email).filter(Boolean) || [];

    // Create in-app notifications for all admins
    const notifications = adminIds.map(adminId => ({
      user_id: adminId,
      type: 'partner_request',
      title: `New ${type || 'partner'} request from ${name}`,
      message: `${name} (${email}) submitted a membership request. Review and approve in the admin panel.`,
      action_url: '/admin/members',
      metadata: { request_id: requestId },
      is_read: false,
    }));

    const { error: notifError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notifError) {
      console.error('Failed to create notifications:', notifError);
    }

    // Send email notification to admins via Resend
    let emailsSent = 0;
    if (resendApiKey && adminEmails.length > 0) {
      const appUrl = getAppUrl();
      const reviewUrl = `${appUrl}/admin/members`;

      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #0E0E10; color: #F5F4EF;">
          <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="color: #C9A24E; font-size: 28px; margin: 0; font-weight: 300;">The Quantum Club</h1>
          </div>
          
          <div style="background: rgba(255,255,255,0.05); border-radius: 16px; padding: 32px; border: 1px solid rgba(201,162,78,0.2);">
            <h2 style="color: #F5F4EF; font-size: 20px; margin: 0 0 16px 0;">New ${type || 'Partner'} Request</h2>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <tr>
                <td style="color: #888; padding: 8px 0; font-size: 14px;">Name</td>
                <td style="color: #F5F4EF; padding: 8px 0; font-size: 14px; text-align: right;">${name}</td>
              </tr>
              <tr>
                <td style="color: #888; padding: 8px 0; font-size: 14px;">Email</td>
                <td style="color: #F5F4EF; padding: 8px 0; font-size: 14px; text-align: right;">${email}</td>
              </tr>
              <tr>
                <td style="color: #888; padding: 8px 0; font-size: 14px;">Type</td>
                <td style="color: #C9A24E; padding: 8px 0; font-size: 14px; text-align: right; text-transform: capitalize;">${type || 'partner'}</td>
              </tr>
            </table>
            
            <div style="text-align: center;">
              <a href="${reviewUrl}" style="display: inline-block; background: linear-gradient(135deg, #C9A24E 0%, #E5C87D 100%); color: #0E0E10; font-weight: 600; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-size: 15px;">
                Review Request
              </a>
            </div>
          </div>
          
          <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 40px 0;" />
          <p style="color: #666; font-size: 12px; text-align: center; margin: 0;">
            The Quantum Club · Admin Notification
          </p>
        </div>
      `;

      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'The Quantum Club <noreply@thequantumclub.nl>',
          to: adminEmails,
          subject: `New ${type || 'partner'} request: ${name}`,
          html: emailHtml
        })
      });

      if (emailResponse.ok) {
        const resendData = await emailResponse.json();
        console.log('Admin notification email sent, Resend ID:', resendData.id);
        emailsSent = adminEmails.length;
      } else {
        const errorBody = await emailResponse.text();
        console.error('Resend error:', emailResponse.status, errorBody);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      notified: adminIds.length,
      emails_sent: emailsSent,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Notify admin error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
