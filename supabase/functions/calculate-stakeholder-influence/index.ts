import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { company_id, stakeholder_id } = await req.json();

    if (!company_id) {
      throw new Error('company_id is required');
    }

    console.log(`[Calculate Influence] Processing company: ${company_id}, stakeholder: ${stakeholder_id || 'all'}`);

    // Fetch stakeholders to analyze
    const stakeholderQuery = supabase
      .from('company_stakeholders')
      .select('*')
      .eq('company_id', company_id);

    if (stakeholder_id) {
      stakeholderQuery.eq('id', stakeholder_id);
    }

    const { data: stakeholders, error: stakeholderError } = await stakeholderQuery;

    if (stakeholderError) {
      throw stakeholderError;
    }

    if (!stakeholders || stakeholders.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No stakeholders found', updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const stakeholder of stakeholders) {
      console.log(`[Calculate Influence] Analyzing: ${stakeholder.full_name}`);

      // Fetch interactions where this stakeholder participated
      const { data: participations, error: participationError } = await supabase
        .from('interaction_participants')
        .select(`
          *,
          interaction:company_interactions(*)
        `)
        .eq('stakeholder_id', stakeholder.id);

      if (participationError) {
        console.error(`[Calculate Influence] Error fetching participations:`, participationError);
        continue;
      }

      if (!participations || participations.length === 0) {
        console.log(`[Calculate Influence] No interactions found for ${stakeholder.full_name}`);
        continue;
      }

      // Calculate influence scores
      let initiationScore = 0;
      let responseScore = 0;
      let mentionScore = 0;
      let meetingLeadershipScore = 0;
      let engagementScore = 0;

      const totalInteractions = participations.length;
      let totalSentiment = 0;
      let sentimentCount = 0;

      participations.forEach((p: any) => {
        const interaction = p.interaction;
        if (!interaction) return;

        // Initiation score (who starts conversations)
        if (p.participation_type === 'sender' || p.participation_type === 'organizer') {
          initiationScore += 1;
        }

        // Response score (who responds)
        if (p.participation_type === 'recipient' && interaction.direction === 'inbound') {
          responseScore += 1;
        }

        // Mention score (who gets CC'd or mentioned)
        if (p.participation_type === 'cc' || p.mentioned_only) {
          mentionScore += 1;
        }

        // Meeting leadership (organizer or main participant)
        if (p.participation_type === 'organizer' || 
            (interaction.interaction_type === 'zoom_meeting' && p.participation_type === 'attendee')) {
          meetingLeadershipScore += 1;
        }

        // Engagement score (total interactions)
        engagementScore += 1;

        // Sentiment
        if (interaction.sentiment_score !== null) {
          totalSentiment += interaction.sentiment_score;
          sentimentCount += 1;
        }
      });

      // Normalize scores (0-100)
      const normalizedInitiation = Math.min(100, (initiationScore / totalInteractions) * 100);
      const normalizedResponse = Math.min(100, (responseScore / totalInteractions) * 100);
      const normalizedMention = Math.min(100, (mentionScore / totalInteractions) * 100);
      const normalizedMeetingLeadership = Math.min(100, (meetingLeadershipScore / totalInteractions) * 100);
      const normalizedEngagement = Math.min(100, (engagementScore / 10) * 100); // Scale to max 10 interactions = 100%

      // Weighted influence score
      const influenceScore = (
        normalizedInitiation * 0.20 +
        normalizedResponse * 0.15 +
        normalizedMention * 0.25 +
        normalizedMeetingLeadership * 0.20 +
        normalizedEngagement * 0.20
      );

      const avgSentiment = sentimentCount > 0 ? totalSentiment / sentimentCount : 0;

      // Classify role based on scores and title
      let roleType = stakeholder.role_type || 'unknown';
      const title = (stakeholder.job_title || '').toLowerCase();
      const isSenior = title.includes('director') || title.includes('vp') || 
                       title.includes('head') || title.includes('chief') || 
                       title.includes('founder') || title.includes('ceo');

      if (normalizedInitiation > 70 && normalizedEngagement > 60 && isSenior) {
        roleType = 'decision_maker';
      } else if (normalizedMention > 60 && normalizedEngagement > 50) {
        roleType = 'influencer';
      } else if (normalizedResponse > 70 && normalizedInitiation < 30) {
        roleType = 'gatekeeper';
      } else if (avgSentiment > 0.7 && normalizedEngagement > 40) {
        roleType = 'champion';
      } else if (avgSentiment < -0.3) {
        roleType = 'blocker';
      }

      // Update stakeholder
      const { error: updateError } = await supabase
        .from('company_stakeholders')
        .update({
          role_type: roleType,
          engagement_score: Math.round(influenceScore),
          sentiment_score: avgSentiment,
          total_interactions: totalInteractions,
          last_contacted_at: new Date().toISOString(),
        })
        .eq('id', stakeholder.id);

      if (updateError) {
        console.error(`[Calculate Influence] Error updating stakeholder:`, updateError);
      } else {
        console.log(`[Calculate Influence] Updated ${stakeholder.full_name}: ${roleType}, score: ${Math.round(influenceScore)}`);
      }

      results.push({
        stakeholder_id: stakeholder.id,
        name: stakeholder.full_name,
        role_type: roleType,
        influence_score: Math.round(influenceScore),
        engagement_score: Math.round(normalizedEngagement),
        sentiment: avgSentiment,
        total_interactions: totalInteractions,
        breakdown: {
          initiation: Math.round(normalizedInitiation),
          response: Math.round(normalizedResponse),
          mention: Math.round(normalizedMention),
          meeting_leadership: Math.round(normalizedMeetingLeadership),
        }
      });
    }

    console.log(`[Calculate Influence] Successfully analyzed ${results.length} stakeholders`);

    return new Response(
      JSON.stringify({
        success: true,
        stakeholders_analyzed: results.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Calculate Influence] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
