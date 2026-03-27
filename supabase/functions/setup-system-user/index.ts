import { createAuthenticatedHandler } from '../_shared/handler.ts';

Deno.serve(createAuthenticatedHandler(async (req, ctx) => {
  // Verify user is admin
  const { data: roles, error: roleError } = await ctx.supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', ctx.user.id)
    .eq('role', 'admin')
    .single();

  if (roleError || !roles) {
    return new Response(
      JSON.stringify({ error: 'Insufficient permissions - admin role required' }),
      {
        headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      }
    );
  }

  console.log('Setting up system user...');

  // Check if system user already exists
  const { data: existingProfile, error: profileError } = await ctx.supabase
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
        headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }

  // Create system user
  const { data: authData, error: authCreateError } = await ctx.supabase.auth.admin.createUser({
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
  const { error: profileUpdateError } = await ctx.supabase
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
      headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  );
}));
