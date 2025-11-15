import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PhoneCallRequest {
  company_id: string;
  job_id?: string;
  stakeholder_ids: string[];
  call_date: string;
  duration_minutes: number;
  summary: string;
  notes?: string;
  direction?: 'inbound' | 'outbound' | 'mutual';
  urgency_score?: number;
  next_action?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Get the user from the auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const body: PhoneCallRequest = await req.json();

    // Validate required fields
    if (!body.company_id || !body.call_date || !body.duration_minutes || !body.stakeholder_ids?.length) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the phone call interaction
    const { data: interaction, error: interactionError } = await supabaseClient
      .from('company_interactions')
      .insert({
        company_id: body.company_id,
        job_id: body.job_id || null,
        interaction_type: 'phone_call',
        interaction_date: body.call_date,
        duration_minutes: body.duration_minutes,
        direction: body.direction || 'outbound',
        our_participant_id: user.id,
        summary: body.summary,
        raw_content: body.notes || null,
        urgency_score: body.urgency_score || null,
        next_action: body.next_action || null,
        is_manually_entered: true,
        status: 'active',
      })
      .select()
      .single();

    if (interactionError) {
      throw interactionError;
    }

    // Add participants
    const participants = body.stakeholder_ids.map(stakeholderId => ({
      interaction_id: interaction.id,
      stakeholder_id: stakeholderId,
      participation_type: body.direction === 'inbound' ? 'sender' : 'recipient',
    }));

    const { error: participantsError } = await supabaseClient
      .from('interaction_participants')
      .insert(participants);

    if (participantsError) {
      throw participantsError;
    }

    // Update stakeholder metrics
    for (const stakeholderId of body.stakeholder_ids) {
      // Increment total_interactions
      const { data: stakeholder } = await supabaseClient
        .from('company_stakeholders')
        .select('total_interactions')
        .eq('id', stakeholderId)
        .single();

      if (stakeholder) {
        await supabaseClient
          .from('company_stakeholders')
          .update({ 
            total_interactions: (stakeholder.total_interactions || 0) + 1,
            last_contacted_at: body.call_date 
          })
          .eq('id', stakeholderId);
      }
    }

    // Run basic sentiment analysis on the notes
    let sentiment_score = 0;
    if (body.notes) {
      const positiveWords = ['great', 'excellent', 'good', 'positive', 'interested', 'excited'];
      const negativeWords = ['concern', 'issue', 'problem', 'difficult', 'challenging'];
      
      const notesLower = body.notes.toLowerCase();
      const positiveCount = positiveWords.filter(word => notesLower.includes(word)).length;
      const negativeCount = negativeWords.filter(word => notesLower.includes(word)).length;
      
      sentiment_score = (positiveCount - negativeCount) / 10; // Normalize to -1 to 1 range
      sentiment_score = Math.max(-1, Math.min(1, sentiment_score));

      // Update interaction with sentiment
      await supabaseClient
        .from('company_interactions')
        .update({ sentiment_score })
        .eq('id', interaction.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        interaction_id: interaction.id,
        sentiment_score,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error logging phone call:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
