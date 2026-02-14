import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TeamInviteRequest {
  email: string;
  inviteCode: string;
  companyId: string;
  companyName: string;
  inviterName?: string;
  role: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      console.warn('RESEND_API_KEY not configured - email not sent');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Email service not configured' 
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify caller is authenticated
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body: TeamInviteRequest = await req.json();
    
    if (!body.email || !body.inviteCode || !body.companyName || !body.companyId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // SERVER-SIDE DOMAIN VALIDATION
    const inviteeDomain = body.email.split('@')[1]?.toLowerCase();
    if (!inviteeDomain) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch allowed domains for this company
    const { data: domainSettings, error: domainError } = await supabase
      .from('organization_domain_settings')
      .select('domain')
      .eq('company_id', body.companyId)
      .eq('is_enabled', true);

    if (domainError) {
      console.error('Error fetching domain settings:', domainError);
      // Continue without domain validation if fetch fails
    }

    const allowedDomains = domainSettings?.map(d => d.domain.toLowerCase()) || [];

    // Only enforce domain validation if domains are configured
    if (allowedDomains.length > 0 && !allowedDomains.includes(inviteeDomain)) {
      const allowedList = allowedDomains.map(d => `@${d}`).join(', ');
      return new Response(JSON.stringify({ 
        error: `Only emails from ${allowedList} are allowed for this company` 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get the site URL - support custom domains
    const siteUrl = Deno.env.get('SITE_URL') || 'https://thequantumclub.lovable.app';
    const signupUrl = `${siteUrl}/auth?invite=${body.inviteCode}`;

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #0E0E10; color: #F5F4EF;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #C9A24E; font-size: 28px; margin: 0; font-weight: 300;">The Quantum Club</h1>
        </div>
        
        <div style="background: rgba(255,255,255,0.05); border-radius: 16px; padding: 32px; border: 1px solid rgba(201,162,78,0.2);">
          <h2 style="color: #F5F4EF; font-size: 24px; margin: 0 0 16px 0;">You're Invited</h2>
          
          <p style="color: #A8A8A8; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
            ${body.inviterName ? `<strong style="color: #F5F4EF;">${body.inviterName}</strong> has invited you` : "You have been invited"} 
            to join <strong style="color: #F5F4EF;">${body.companyName}</strong> on The Quantum Club as a <strong style="color: #C9A24E;">${body.role}</strong>.
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${signupUrl}" style="display: inline-block; background: linear-gradient(135deg, #C9A24E 0%, #E5C87D 100%); color: #0E0E10; font-weight: 600; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-size: 16px;">
              Accept Invitation
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0;">
            This invitation expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
        
        <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 40px 0;" />
        
        <p style="color: #666; font-size: 12px; text-align: center; margin: 0;">
          The Quantum Club · Elite Talent Network
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
        to: body.email,
        subject: `You're invited to join ${body.companyName} on The Quantum Club`,
        html: emailHtml
      })
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Resend error:', errorText);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to send email' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Log the sent invite
    await supabase
      .from('comprehensive_audit_logs')
      .insert({
        actor_id: user.id,
        actor_role: 'user',
        action_type: 'team_invite_sent',
        action_category: 'communication',
        resource_type: 'invite',
        description: `Team invite sent to ${body.email} for ${body.companyName}`,
        new_value: {
          email: body.email,
          company_id: body.companyId,
          company_name: body.companyName,
          role: body.role,
          invite_code: body.inviteCode,
          domain_validated: allowedDomains.length > 0
        },
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown'
      });

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Invitation sent to ${body.email}` 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Team invite error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
