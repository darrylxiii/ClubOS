import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id, email, category, priority, subject, description, metadata, company_id } = await req.json();

    // Create support ticket
    const { data: ticket, error: ticketError } = await supabaseClient
      .from('support_tickets')
      .insert({
        user_id: user_id || null,
        created_by_email: email,
        company_id: company_id || null,
        category,
        priority: priority || 'medium',
        subject,
        description,
        metadata: metadata || {},
        channel: 'in_app',
        status: 'open',
      })
      .select()
      .single();

    if (ticketError) throw ticketError;

    // Auto-assign based on category (simple round-robin for now)
    // In production, use workload balancing
    const { data: agents } = await supabaseClient
      .from('user_roles')
      .select('user_id, profiles!inner(full_name, email)')
      .eq('role', 'strategist')
      .limit(1);

    if (agents && agents.length > 0) {
      await supabaseClient
        .from('support_tickets')
        .update({
          assigned_to: agents[0].user_id,
          assigned_at: new Date().toISOString(),
        })
        .eq('id', ticket.id);
    }

    // Send notification to user
    if (user_id) {
      await supabaseClient
        .from('notifications')
        .insert({
          user_id,
          title: 'Support Ticket Created',
          message: `Your ticket ${ticket.ticket_number} has been received. We'll respond within ${ticket.sla_target_response_minutes || 120} minutes.`,
          type: 'support',
          action_url: `/support/tickets/${ticket.id}`,
          metadata: { ticket_id: ticket.id },
        });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        ticket,
        message: 'Support ticket created successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating support ticket:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
