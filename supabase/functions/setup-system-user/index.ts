import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify user is admin
    const { data: roles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roles) {
      throw new Error('Insufficient permissions - admin role required');
    }

    console.log('Setting up system user...');

    // Check if system user already exists
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', 'system@thequantumclub.nl')
      .single();

    if (existingProfile) {
      console.log('System user already exists:', existingProfile.id);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'System user already exists',
          system_user_id: existingProfile.id,
          email: existingProfile.email,
          full_name: existingProfile.full_name
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Create system user
    const { data: authData, error: authCreateError } = await supabase.auth.admin.createUser({
      email: 'system@thequantumclub.nl',
      password: crypto.randomUUID(), // Random secure password (won't be used)
      email_confirm: true,
      user_metadata: {
        full_name: 'The Quantum Club',
        is_system_account: true,
        account_type: 'company',
        can_be_messaged: true
      }
    });

    if (authCreateError || !authData.user) {
      console.error('Failed to create system user:', authCreateError);
      throw new Error('Failed to create system user');
    }

    const systemUserId = authData.user.id;
    console.log('System user created successfully:', systemUserId);

    // Update profile with additional details
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({
        full_name: 'The Quantum Club',
        bio: 'Official company account for The Quantum Club. We use this account to communicate important updates and respond to feedback.'
      })
      .eq('id', systemUserId);

    if (profileUpdateError) {
      console.warn('Failed to update profile details:', profileUpdateError);
      // Don't fail the request if profile update fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'System user created successfully',
        system_user_id: systemUserId,
        email: 'system@thequantumclub.nl'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in setup-system-user:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
