import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const gdprDeleteSchema = z.object({
  action: z.enum(['request', 'cancel']),
  reason: z.string().trim().max(1000, 'Reason must be under 1000 characters').optional(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const parseResult = gdprDeleteSchema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: parseResult.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, reason } = parseResult.data;

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (action === 'request') {
      const scheduledFor = new Date();
      scheduledFor.setDate(scheduledFor.getDate() + 30);

      const { data: deletionRequest, error: requestError } = await adminClient
        .from('deletion_requests')
        .insert({
          user_id: user.id,
          scheduled_for: scheduledFor.toISOString(),
          reason: reason ?? null,
          status: 'pending',
        })
        .select()
        .single();

      if (requestError) throw requestError;

      await adminClient.from('audit_events').insert({
        event_type: 'gdpr_deletion_requested',
        actor_id: user.id,
        actor_email: user.email,
        action: 'deletion_requested',
        metadata: {
          deletion_request_id: deletionRequest.id,
          scheduled_for: scheduledFor.toISOString(),
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          scheduled_for: scheduledFor.toISOString(),
          deletion_request_id: deletionRequest.id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (action === 'cancel') {
      const { error: cancelError } = await adminClient
        .from('deletion_requests')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('status', 'pending');

      if (cancelError) throw cancelError;

      await adminClient.from('audit_events').insert({
        event_type: 'gdpr_deletion_cancelled',
        actor_id: user.id,
        actor_email: user.email,
        action: 'deletion_cancelled',
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('GDPR delete error:', error);
    return new Response(
      JSON.stringify({ error: 'An internal error occurred. Please try again later.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
