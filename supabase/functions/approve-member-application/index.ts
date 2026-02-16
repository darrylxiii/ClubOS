import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Authenticate caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify admin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .in('role', ['admin', 'company_admin'])
      .limit(1);

    if (roleError || !roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { applicationId, sendEmail } = await req.json();

    if (!applicationId || typeof applicationId !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid application ID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch application
    const { data: application, error: fetchError } = await supabaseAdmin
      .from('candidate_profiles')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) {
      return new Response(JSON.stringify({ error: 'Application not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (application.application_status === 'approved') {
      return new Response(JSON.stringify({ error: 'Application already approved' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create auth user via admin API (service role)
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: application.email,
      email_confirm: true,
      user_metadata: {
        full_name: application.full_name,
      },
    });

    if (createError || !authData.user) {
      console.error('Auth creation failed:', createError);
      return new Response(JSON.stringify({ error: 'Failed to create user account' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const newUserId = authData.user.id;

    // Update candidate profile
    await supabaseAdmin
      .from('candidate_profiles')
      .update({
        application_status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: caller.id,
        user_id: newUserId,
      })
      .eq('id', applicationId);

    // Create profile
    await supabaseAdmin.from('profiles').upsert({
      id: newUserId,
      full_name: application.full_name,
      email: application.email,
      phone: application.phone,
      phone_verified: true,
      email_verified: true,
      location: application.location,
      current_title: application.current_title,
      linkedin_url: application.linkedin_url,
      onboarding_completed_at: new Date().toISOString(),
    });

    // Assign user role
    await supabaseAdmin.from('user_roles').insert({
      user_id: newUserId,
      role: 'user',
    });

    // Log activity
    await supabaseAdmin.from('candidate_application_logs').insert({
      candidate_profile_id: applicationId,
      action: 'approved',
      actor_id: caller.id,
      details: { send_email: sendEmail ?? false },
    });

    return new Response(
      JSON.stringify({
        success: true,
        userId: newUserId,
        message: 'Member approved successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Approve member error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
