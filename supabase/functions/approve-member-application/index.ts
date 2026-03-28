import { createAuthenticatedHandler } from '../_shared/handler.ts';
import { z, parseBody, uuidSchema } from '../_shared/validation.ts';

const requestSchema = z.object({
  applicationId: uuidSchema,
  sendEmail: z.boolean().optional(),
});

Deno.serve(createAuthenticatedHandler(async (req, ctx) => {
    const corsHeaders = ctx.corsHeaders;
    const supabaseAdmin = ctx.supabase;
    const caller = ctx.user;

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

    const parsed = await parseBody(req, requestSchema, corsHeaders);
    if ('error' in parsed) return parsed.error;
    const { applicationId, sendEmail } = parsed.data;

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

    // Send welcome email to the approved member
    if (sendEmail !== false) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        const welcomeResponse = await fetch(
          `${supabaseUrl}/functions/v1/send-approval-notification`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: newUserId,
              email: application.email,
              fullName: application.full_name,
              requestType: 'candidate',
              status: 'approved',
            }),
          }
        );

        if (!welcomeResponse.ok) {
          console.error('Welcome email failed:', await welcomeResponse.text());
        }
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }
    }

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
}));
