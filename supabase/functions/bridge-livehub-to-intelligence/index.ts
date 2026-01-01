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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { recording_id, summary_id, channel, summary, topics, entities } = await req.json();

    console.log(`[BridgeIntelligence] Processing recording: ${recording_id}`);

    const bridgeResults: Record<string, unknown> = {};

    // 1. Create company_interactions record if company linked
    if (channel?.company_id) {
      const { data: interaction, error: interactionError } = await supabase
        .from('company_interactions')
        .insert({
          company_id: channel.company_id,
          interaction_type: 'livehub_call',
          interaction_date: new Date().toISOString(),
          summary: summary || `LiveHub session in channel: ${channel.name}`,
          sentiment_score: 0.7, // Neutral-positive default
          key_topics: topics || [],
          source_type: 'livehub',
          source_id: recording_id,
          metadata: {
            channel_id: channel.id,
            channel_name: channel.name,
            purpose_tags: channel.purpose_tags,
            job_id: channel.job_id,
            candidate_ids: channel.candidate_ids
          }
        })
        .select()
        .single();

      if (interactionError) {
        console.warn(`[BridgeIntelligence] Error creating interaction: ${interactionError.message}`);
      } else {
        bridgeResults.interaction_id = interaction?.id;
        console.log(`[BridgeIntelligence] Created company interaction: ${interaction?.id}`);
      }
    }

    // 2. Extract and store entity relationships
    if (entities) {
      const relationships: Array<{
        source_type: string;
        source_id: string;
        target_type: string;
        target_name: string;
        relationship_type: string;
        context: Record<string, unknown>;
      }> = [];

      // Link mentioned companies
      if (entities.companies?.length) {
        for (const companyName of entities.companies) {
          // Try to find matching company
          const { data: matchedCompany } = await supabase
            .from('companies')
            .select('id, name')
            .ilike('name', `%${companyName}%`)
            .limit(1)
            .single();

          if (matchedCompany) {
            relationships.push({
              source_type: 'livehub_recording',
              source_id: recording_id,
              target_type: 'company',
              target_name: matchedCompany.name,
              relationship_type: 'mentioned_in_call',
              context: { channel_id: channel?.id }
            });
          }
        }
      }

      // Link mentioned people to stakeholders
      if (entities.people?.length) {
        for (const personName of entities.people) {
          relationships.push({
            source_type: 'livehub_recording',
            source_id: recording_id,
            target_type: 'person',
            target_name: personName,
            relationship_type: 'discussed_in_call',
            context: { channel_id: channel?.id, company_id: channel?.company_id }
          });
        }
      }

      // Store relationships in entity_relationships table
      if (relationships.length > 0) {
        const { error: relError } = await supabase
          .from('entity_relationships')
          .insert(relationships.map(r => ({
            source_entity_type: r.source_type,
            source_entity_id: r.source_id,
            target_entity_type: r.target_type,
            target_entity_id: null, // Will be resolved later
            relationship_type: r.relationship_type,
            context: { ...r.context, target_name: r.target_name }
          })));

        if (relError) {
          console.warn(`[BridgeIntelligence] Error storing relationships: ${relError.message}`);
        } else {
          bridgeResults.relationships_created = relationships.length;
        }
      }
    }

    // 3. Update stakeholder memory with any quotes/preferences
    if (channel?.company_id && summary) {
      const { error: memoryError } = await supabase
        .from('stakeholder_memory')
        .insert({
          company_id: channel.company_id,
          stakeholder_name: 'Team Discussion',
          memory_type: 'conversation_summary',
          content: summary,
          source_type: 'livehub',
          source_id: recording_id,
          confidence_score: 0.8,
          context: {
            channel_name: channel.name,
            topics: topics
          }
        });

      if (!memoryError) {
        bridgeResults.memory_created = true;
      }
    }

    // 4. Feed intelligence timeline
    if (channel?.company_id) {
      await supabase
        .from('intelligence_timeline')
        .insert({
          company_id: channel.company_id,
          event_type: 'livehub_session',
          event_title: `LiveHub: ${channel.name}`,
          event_description: summary || 'Voice session completed',
          event_date: new Date().toISOString(),
          importance_score: 0.6,
          source_type: 'livehub',
          source_id: recording_id,
          metadata: {
            topics: topics,
            job_id: channel.job_id,
            candidate_ids: channel.candidate_ids
          }
        });

      bridgeResults.timeline_event = true;
    }

    // 5. Update company intelligence scores
    if (channel?.company_id) {
      // Increment engagement score for having a LiveHub call
      const { data: currentScore } = await supabase
        .from('company_intelligence_scores')
        .select('*')
        .eq('company_id', channel.company_id)
        .single();

      if (currentScore) {
        await supabase
          .from('company_intelligence_scores')
          .update({
            engagement_score: Math.min(100, (currentScore.engagement_score || 0) + 5),
            last_interaction_date: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('company_id', channel.company_id);
      } else {
        await supabase
          .from('company_intelligence_scores')
          .insert({
            company_id: channel.company_id,
            engagement_score: 50,
            relationship_health: 70,
            last_interaction_date: new Date().toISOString()
          });
      }

      bridgeResults.scores_updated = true;
    }

    // 6. Log the bridge operation
    await supabase
      .from('livehub_intelligence_bridge_log')
      .insert({
        recording_id,
        summary_id,
        channel_id: channel?.id,
        company_id: channel?.company_id,
        bridge_results: bridgeResults,
        status: 'completed'
      });

    console.log(`[BridgeIntelligence] Complete:`, bridgeResults);

    return new Response(JSON.stringify({
      success: true,
      recording_id,
      results: bridgeResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[BridgeIntelligence] Error:', errorMessage);
    return new Response(JSON.stringify({
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
