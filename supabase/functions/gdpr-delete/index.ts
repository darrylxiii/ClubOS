import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { publicCorsHeaders as corsHeaders } from '../_shared/cors-config.ts';

serve(async (req) => {
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

    const { action, reason } = await req.json();

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (action === 'request') {
      // Schedule deletion for 30 days from now
      const scheduledFor = new Date();
      scheduledFor.setDate(scheduledFor.getDate() + 30);

      const { data: deletionRequest, error: requestError } = await adminClient
        .from('deletion_requests')
        .insert({
          user_id: user.id,
          scheduled_for: scheduledFor.toISOString(),
          reason,
          status: 'pending',
        })
        .select()
        .single();

      if (requestError) throw requestError;

      // Log audit event
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
      // Cancel pending deletion
      const { error: cancelError } = await adminClient
        .from('deletion_requests')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('status', 'pending');

      if (cancelError) throw cancelError;

      // Log audit event
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
