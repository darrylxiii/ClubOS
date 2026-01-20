import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EntityRelationship {
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
  relationship_type: string;
  strength_score: number;
  evidence: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { mode = 'incremental', since_hours = 24 } = await req.json().catch(() => ({}));
    
    console.log('[Knowledge Graph] Building graph, mode:', mode, 'since_hours:', since_hours);

    const relationships: EntityRelationship[] = [];
    const sinceDate = new Date(Date.now() - since_hours * 60 * 60 * 1000).toISOString();

    // 1. Extract relationships from meetings (attendees know each other)
    const { data: meetings } = await supabase
      .from('meetings')
      .select(`
        id, title, company_id, job_id, created_at,
        meeting_participants(id, participant_type, user_id, candidate_id, external_email, external_name)
      `)
      .gte('created_at', mode === 'incremental' ? sinceDate : '1970-01-01');

    if (meetings) {
      for (const meeting of meetings) {
        const participants = meeting.meeting_participants || [];
        
        // Link meeting to company
        if (meeting.company_id) {
          relationships.push({
            source_type: 'meeting',
            source_id: meeting.id,
            target_type: 'company',
            target_id: meeting.company_id,
            relationship_type: 'belongs_to',
            strength_score: 1.0,
            evidence: { meeting_title: meeting.title, created_at: meeting.created_at }
          });
        }

        // Link participants to each other (co-attended)
        for (let i = 0; i < participants.length; i++) {
          for (let j = i + 1; j < participants.length; j++) {
            const p1 = participants[i];
            const p2 = participants[j];
            
            const source = p1.user_id ? { type: 'user', id: p1.user_id } 
                         : p1.candidate_id ? { type: 'candidate', id: p1.candidate_id }
                         : { type: 'external', id: p1.external_email || p1.id };
            
            const target = p2.user_id ? { type: 'user', id: p2.user_id }
                         : p2.candidate_id ? { type: 'candidate', id: p2.candidate_id }
                         : { type: 'external', id: p2.external_email || p2.id };

            relationships.push({
              source_type: source.type,
              source_id: source.id,
              target_type: target.type,
              target_id: target.id,
              relationship_type: 'co_attended_meeting',
              strength_score: 0.7,
              evidence: { meeting_id: meeting.id, meeting_title: meeting.title }
            });
          }

          // Link candidates to company via meeting
          if (participants[i].candidate_id && meeting.company_id) {
            relationships.push({
              source_type: 'candidate',
              source_id: participants[i].candidate_id,
              target_type: 'company',
              target_id: meeting.company_id,
              relationship_type: 'met_with',
              strength_score: 0.8,
              evidence: { meeting_id: meeting.id, context: 'meeting' }
            });
          }
        }
      }
    }

    // 2. Extract relationships from applications
    const { data: applications } = await supabase
      .from('applications')
      .select('id, candidate_id, job_id, status, company_name, created_at')
      .gte('created_at', mode === 'incremental' ? sinceDate : '1970-01-01');

    if (applications) {
      for (const app of applications) {
        if (app.candidate_id && app.job_id) {
          // Get company from job
          const { data: job } = await supabase
            .from('jobs')
            .select('company_id')
            .eq('id', app.job_id)
            .single();

          if (job?.company_id) {
            const strengthMap: Record<string, number> = {
              'hired': 1.0,
              'offer': 0.95,
              'final_interview': 0.85,
              'interview': 0.7,
              'screening': 0.5,
              'applied': 0.3
            };

            relationships.push({
              source_type: 'candidate',
              source_id: app.candidate_id,
              target_type: 'company',
              target_id: job.company_id,
              relationship_type: 'applied_to',
              strength_score: strengthMap[app.status] || 0.3,
              evidence: { application_id: app.id, job_id: app.job_id, status: app.status }
            });
          }
        }
      }
    }

    // 3. Extract relationships from company interactions
    const { data: interactions } = await supabase
      .from('company_interactions')
      .select('id, company_id, candidate_id, stakeholder_id, interaction_type, created_at')
      .gte('created_at', mode === 'incremental' ? sinceDate : '1970-01-01');

    if (interactions) {
      for (const interaction of interactions) {
        // Candidate-Company relationship
        if (interaction.candidate_id && interaction.company_id) {
          relationships.push({
            source_type: 'candidate',
            source_id: interaction.candidate_id,
            target_type: 'company',
            target_id: interaction.company_id,
            relationship_type: 'interacted_with',
            strength_score: 0.6,
            evidence: { interaction_id: interaction.id, type: interaction.interaction_type }
          });
        }

        // Stakeholder-Company relationship
        if (interaction.stakeholder_id && interaction.company_id) {
          relationships.push({
            source_type: 'stakeholder',
            source_id: interaction.stakeholder_id,
            target_type: 'company',
            target_id: interaction.company_id,
            relationship_type: 'works_at',
            strength_score: 0.9,
            evidence: { interaction_id: interaction.id }
          });
        }

        // Stakeholder-Candidate relationship
        if (interaction.stakeholder_id && interaction.candidate_id) {
          relationships.push({
            source_type: 'stakeholder',
            source_id: interaction.stakeholder_id,
            target_type: 'candidate',
            target_id: interaction.candidate_id,
            relationship_type: 'interacted_with',
            strength_score: 0.7,
            evidence: { interaction_id: interaction.id, type: interaction.interaction_type }
          });
        }
      }
    }

    // 4. Extract relationships from referrals
    const { data: referrals } = await supabase
      .from('referrals')
      .select('id, referrer_id, referee_id, job_id, status, created_at')
      .gte('created_at', mode === 'incremental' ? sinceDate : '1970-01-01');

    if (referrals) {
      for (const referral of referrals) {
        if (referral.referrer_id && referral.referee_id) {
          relationships.push({
            source_type: 'user',
            source_id: referral.referrer_id,
            target_type: 'candidate',
            target_id: referral.referee_id,
            relationship_type: 'referred',
            strength_score: 0.9,
            evidence: { referral_id: referral.id, status: referral.status }
          });
        }
      }
    }

    // 5. Extract relationships from stakeholders
    const { data: stakeholders } = await supabase
      .from('company_stakeholders')
      .select('id, company_id, name, role, influence_score, created_at')
      .gte('created_at', mode === 'incremental' ? sinceDate : '1970-01-01');

    if (stakeholders) {
      for (const stakeholder of stakeholders) {
        relationships.push({
          source_type: 'stakeholder',
          source_id: stakeholder.id,
          target_type: 'company',
          target_id: stakeholder.company_id,
          relationship_type: 'works_at',
          strength_score: stakeholder.influence_score || 0.5,
          evidence: { role: stakeholder.role, name: stakeholder.name }
        });
      }
    }

    // Deduplicate and upsert relationships
    const uniqueRelationships = new Map<string, EntityRelationship>();
    
    for (const rel of relationships) {
      const key = `${rel.source_type}:${rel.source_id}:${rel.target_type}:${rel.target_id}:${rel.relationship_type}`;
      const existing = uniqueRelationships.get(key);
      
      if (!existing || rel.strength_score > existing.strength_score) {
        uniqueRelationships.set(key, rel);
      }
    }

    // Insert into entity_relationships table
    const toInsert = Array.from(uniqueRelationships.values()).map(rel => ({
      source_type: rel.source_type,
      source_id: rel.source_id,
      target_type: rel.target_type,
      target_id: rel.target_id,
      relationship_type: rel.relationship_type,
      strength_score: rel.strength_score,
      evidence: rel.evidence,
      created_at: new Date().toISOString()
    }));

    if (toInsert.length > 0) {
      // Batch insert in chunks
      const chunkSize = 100;
      let insertedCount = 0;
      
      for (let i = 0; i < toInsert.length; i += chunkSize) {
        const chunk = toInsert.slice(i, i + chunkSize);
        const { error } = await supabase
          .from('entity_relationships')
          .upsert(chunk, { 
            onConflict: 'source_type,source_id,target_type,target_id,relationship_type',
            ignoreDuplicates: false 
          });
        
        if (error) {
          console.error('[Knowledge Graph] Insert error:', error);
        } else {
          insertedCount += chunk.length;
        }
      }

      console.log('[Knowledge Graph] Inserted/updated', insertedCount, 'relationships');
    }

    // Update intelligence timeline
    await supabase.from('intelligence_timeline').insert({
      entity_type: 'system',
      entity_id: '00000000-0000-0000-0000-000000000000',
      event_type: 'knowledge_graph_build',
      event_data: {
        mode,
        relationships_processed: toInsert.length,
        sources: {
          meetings: meetings?.length || 0,
          applications: applications?.length || 0,
          interactions: interactions?.length || 0,
          referrals: referrals?.length || 0,
          stakeholders: stakeholders?.length || 0
        }
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        mode,
        relationships_created: toInsert.length,
        sources: {
          meetings: meetings?.length || 0,
          applications: applications?.length || 0,
          interactions: interactions?.length || 0,
          referrals: referrals?.length || 0,
          stakeholders: stakeholders?.length || 0
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Knowledge Graph] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
