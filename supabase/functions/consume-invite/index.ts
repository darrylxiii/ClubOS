import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * consume-invite: Called after signup with an invite code.
 * 1. Calls use_invite_code() to mark the code as used
 * 2. If the invite has a company_id, adds user to company_members
 * 3. If the invite has a target_role, assigns user_roles
 * 4. If target_role is 'partner', auto-approves (invite = approval)
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Authenticate the calling user
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

    const { code } = await req.json();
    if (!code || typeof code !== 'string') {
      return new Response(JSON.stringify({ error: 'Invite code is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Step 1: Consume the invite code via DB function
    const { data: consumeResult, error: consumeError } = await supabase
      .rpc('use_invite_code', { _code: code.toUpperCase(), _user_id: user.id });

    if (consumeError) {
      console.error('use_invite_code error:', consumeError);
      return new Response(JSON.stringify({ error: 'Failed to consume invite code' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!consumeResult?.success) {
      return new Response(JSON.stringify({ 
        error: consumeResult?.error || 'Invalid or expired invite code' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Step 2: Fetch invite details for company + role assignment
    const { data: inviteData } = await supabase
      .from('invite_codes')
      .select('company_id, target_role, invite_type, welcome_message')
      .eq('code', code.toUpperCase())
      .single();

    let companyAssigned = false;
    let roleAssigned = false;

    // Step 3: Add to company_members if invite has a company
    if (inviteData?.company_id) {
      // Check if already a member
      const { data: existingMember } = await supabase
        .from('company_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('company_id', inviteData.company_id)
        .maybeSingle();

      if (!existingMember) {
        const { error: memberError } = await supabase
          .from('company_members')
          .insert({
            user_id: user.id,
            company_id: inviteData.company_id,
            role: inviteData.target_role === 'partner' ? 'member' : (inviteData.target_role || 'member'),
            is_active: true
          });

        if (memberError) {
          console.error('company_members insert error:', memberError);
        } else {
          companyAssigned = true;
        }
      } else {
        companyAssigned = true; // Already a member
      }
    }

    // Step 4: Assign role if target_role is set (partner, strategist, etc.)
    if (inviteData?.target_role) {
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', user.id)
        .eq('role', inviteData.target_role)
        .maybeSingle();

      if (!existingRole) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: user.id,
            role: inviteData.target_role
          });

        if (roleError) {
          console.error('user_roles insert error:', roleError);
        } else {
          roleAssigned = true;
        }
      } else {
        roleAssigned = true; // Already has role
      }
    }

    // Step 5: Auto-approve partners (invite IS the approval)
    if (inviteData?.target_role === 'partner') {
      const { error: statusError } = await supabase
        .from('profiles')
        .update({ account_status: 'approved' })
        .eq('id', user.id);

      if (statusError) {
        console.error('Failed to auto-approve partner via invite:', statusError);
      }
    }

    // Step 6: Audit log (schema-compliant column names)
    await supabase
      .from('comprehensive_audit_logs')
      .insert({
        actor_id: user.id,
        actor_role: 'user',
        event_type: 'invite_code_consumed',
        action: 'invite_code_consumed',
        event_category: 'authentication',
        resource_type: 'invite_code',
        description: `Consumed invite code ${code.substring(0, 6)}*** and joined ${inviteData?.company_id ? 'company' : 'platform'}`,
        after_value: {
          invite_code: code.substring(0, 6) + '***',
          company_assigned: companyAssigned,
          role_assigned: roleAssigned,
          target_role: inviteData?.target_role,
          auto_approved: inviteData?.target_role === 'partner',
        },
        actor_ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        actor_user_agent: req.headers.get('user-agent') || 'unknown'
      });

    return new Response(JSON.stringify({
      success: true,
      company_assigned: companyAssigned,
      role_assigned: roleAssigned,
      company_id: inviteData?.company_id || null,
      target_role: inviteData?.target_role || null,
      message: 'Invite code consumed successfully'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('consume-invite error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
