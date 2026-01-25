/**
 * Embed Meeting Intelligence Edge Function
 * 
 * Generates and stores embeddings for meeting-related entities:
 * - meeting_candidate: Candidate's responses, skills, performance
 * - meeting_job: Interview Q&A patterns for the role
 * - meeting_interviewer: Hiring manager patterns and decision signals
 * - interaction: Full meeting for company intelligence RAG
 * 
 * Usage: POST /embed-meeting-intelligence
 * Body: { recordingId: string }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EMBEDDING_CHUNK_SIZE = 8000; // Characters per chunk for embedding

interface EmbeddingResult {
  entity_type: string;
  entity_id: string;
  success: boolean;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { recordingId, batchMode = false } = await req.json();
    
    if (!recordingId) {
      throw new Error('recordingId is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Use OpenAI API key for embeddings (Lovable AI doesn't support embedding models)
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[EmbedMeeting] 🚀 Starting embedding generation for: ${recordingId}`);

    // Fetch recording with all related data
    const { data: recording, error: recordingError } = await supabase
      .from('meeting_recordings_extended')
      .select(`
        id,
        meeting_id,
        transcript,
        transcript_json,
        executive_summary,
        action_items,
        key_moments,
        skills_assessed,
        ai_analysis,
        candidate_id,
        job_id,
        application_id,
        host_id,
        analysis_status
      `)
      .eq('id', recordingId)
      .single();

    if (recordingError || !recording) {
      console.error(`[EmbedMeeting] Recording fetch error:`, recordingError);
      throw new Error(`Recording not found: ${recordingId}`);
    }

    console.log(`[EmbedMeeting] 📋 Recording found - analysis_status: ${recording.analysis_status}, host_id: ${recording.host_id}`);

    // Skip if not analyzed yet
    if (recording.analysis_status !== 'completed') {
      console.log(`[EmbedMeeting] ⏭️ Skipping - analysis not complete: ${recording.analysis_status}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          reason: 'Analysis not complete',
          status: recording.analysis_status 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: EmbeddingResult[] = [];

    // Generate embedding helper
    async function generateEmbedding(text: string): Promise<number[] | null> {
      if (!text || text.length < 20) {
        console.log(`[EmbedMeeting] Skipping embedding - text too short: ${text.length} chars`);
        return null;
      }
      
      // Truncate if too long and clean up the text
      let cleanText = text
        .replace(/\s+/g, ' ')
        .trim();
      
      if (cleanText.length > EMBEDDING_CHUNK_SIZE) {
        cleanText = cleanText.substring(0, EMBEDDING_CHUNK_SIZE);
      }

      console.log(`[EmbedMeeting] Generating embedding for ${cleanText.length} chars`);

      try {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: cleanText,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[EmbedMeeting] Embedding API error: ${response.status} - ${errorText}`);
          return null;
        }

        const data = await response.json();
        return data.data?.[0]?.embedding || null;
      } catch (err) {
        console.error(`[EmbedMeeting] Embedding fetch error:`, err);
        return null;
      }
    }

    // Store embedding in intelligence_embeddings
    async function storeIntelligenceEmbedding(
      entityType: string,
      entityId: string,
      content: string,
      embedding: number[],
      metadata: Record<string, any>
    ): Promise<boolean> {
      try {
        const { error } = await supabase
          .from('intelligence_embeddings')
          .upsert({
            entity_type: entityType,
            entity_id: entityId,
            content: content.substring(0, 10000),
            embedding: embedding,
            metadata: {
              ...metadata,
              recording_id: recordingId,
              generated_at: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'entity_type,entity_id',
          });

        if (error) {
          console.error(`[EmbedMeeting] Failed to store ${entityType}:`, error);
          return false;
        }
        return true;
      } catch (err) {
        console.error(`[EmbedMeeting] Store error for ${entityType}:`, err);
        return false;
      }
    }

    // 1. CANDIDATE EMBEDDING (meeting_candidate)
    if (recording.candidate_id) {
      console.log('[EmbedMeeting] 📊 Generating candidate embedding...');
      
      // Build candidate context from meeting
      const candidateContent = [
        recording.executive_summary || '',
        recording.skills_assessed ? `Skills discussed: ${JSON.stringify(recording.skills_assessed)}` : '',
        recording.ai_analysis ? `Analysis insights: ${typeof recording.ai_analysis === 'string' ? recording.ai_analysis.substring(0, 2000) : JSON.stringify(recording.ai_analysis).substring(0, 2000)}` : '',
        // Extract candidate segments from transcript if available
        recording.transcript ? `Interview transcript summary: ${recording.transcript.substring(0, 3000)}` : '',
      ].filter(Boolean).join('\n\n');

      const candidateEmbedding = await generateEmbedding(candidateContent);
      
      if (candidateEmbedding) {
        const success = await storeIntelligenceEmbedding(
          'meeting_candidate',
          recording.candidate_id,
          candidateContent,
          candidateEmbedding,
          {
            job_id: recording.job_id,
            skills_assessed: recording.skills_assessed,
          }
        );
        results.push({ 
          entity_type: 'meeting_candidate', 
          entity_id: recording.candidate_id, 
          success 
        });
      } else {
        results.push({ 
          entity_type: 'meeting_candidate', 
          entity_id: recording.candidate_id, 
          success: false,
          error: 'Failed to generate embedding'
        });
      }
    }

    // 2. JOB EMBEDDING (meeting_job)
    if (recording.job_id) {
      console.log('[EmbedMeeting] 💼 Generating job embedding...');
      
      // Build job context from meeting
      const jobContent = [
        recording.executive_summary || '',
        recording.key_moments ? `Interview key moments: ${JSON.stringify(recording.key_moments)}` : '',
        recording.action_items ? `Hiring actions: ${JSON.stringify(recording.action_items)}` : '',
      ].filter(Boolean).join('\n\n');

      const jobEmbedding = await generateEmbedding(jobContent);
      
      if (jobEmbedding) {
        const success = await storeIntelligenceEmbedding(
          'meeting_job',
          recording.job_id,
          jobContent,
          jobEmbedding,
          {
            candidate_id: recording.candidate_id,
            action_items: recording.action_items,
          }
        );
        results.push({ 
          entity_type: 'meeting_job', 
          entity_id: recording.job_id, 
          success 
        });
      } else {
        results.push({ 
          entity_type: 'meeting_job', 
          entity_id: recording.job_id, 
          success: false,
          error: 'Failed to generate embedding'
        });
      }
    }

    // 3. INTERVIEWER EMBEDDING (meeting_interviewer)
    if (recording.host_id) {
      console.log('[EmbedMeeting] 🎤 Generating interviewer embedding...');
      
      // Fetch hiring manager patterns if available
      let hiringPatterns = null;
      try {
        const { data } = await supabase
          .from('hiring_manager_profiles')
          .select('*')
          .eq('user_id', recording.host_id)
          .single();
        hiringPatterns = data;
      } catch (err) {
        // No patterns yet - that's okay
      }

      const interviewerContent = [
        recording.executive_summary ? `Interview style: ${recording.executive_summary}` : '',
        recording.key_moments ? `Key moments: ${JSON.stringify(recording.key_moments)}` : '',
        hiringPatterns?.communication_style ? `Communication style: ${hiringPatterns.communication_style}` : '',
        hiringPatterns?.cultural_priorities ? `Cultural priorities: ${JSON.stringify(hiringPatterns.cultural_priorities)}` : '',
        hiringPatterns?.decision_patterns ? `Decision patterns: ${JSON.stringify(hiringPatterns.decision_patterns)}` : '',
        recording.transcript ? `Meeting context: ${recording.transcript.substring(0, 2000)}` : '',
      ].filter(Boolean).join('\n\n');

      if (interviewerContent.length > 50) {
        const interviewerEmbedding = await generateEmbedding(interviewerContent);
        
        if (interviewerEmbedding) {
          const success = await storeIntelligenceEmbedding(
            'meeting_interviewer',
            recording.host_id,
            interviewerContent,
            interviewerEmbedding,
            {
              job_id: recording.job_id,
              candidate_id: recording.candidate_id,
            }
          );
          results.push({ 
            entity_type: 'meeting_interviewer', 
            entity_id: recording.host_id, 
            success 
          });
        }
      } else {
        console.log('[EmbedMeeting] ⏭️ Skipping interviewer embedding - insufficient content');
      }
    }

    // 4. COMPANY INTERACTION EMBEDDING (via bridge-meeting-to-intelligence)
    // This is handled by the existing bridge function, but we can update it here too
    if (recording.meeting_id) {
      console.log('[EmbedMeeting] 🏢 Updating company interaction embedding...');
      
      const interactionContent = [
        recording.executive_summary || '',
        recording.transcript ? `Full transcript: ${recording.transcript.substring(0, 5000)}` : '',
      ].filter(Boolean).join('\n\n');

      if (interactionContent.length > 50) {
        const interactionEmbedding = await generateEmbedding(interactionContent);
        
        if (interactionEmbedding) {
          // Update company_interactions if exists
          const { error: updateError } = await supabase
            .from('company_interactions')
            .update({
              interaction_embedding: interactionEmbedding,
              updated_at: new Date().toISOString(),
            })
            .eq('meeting_id', recording.meeting_id);

          results.push({ 
            entity_type: 'interaction', 
            entity_id: recording.meeting_id, 
            success: !updateError,
            error: updateError?.message
          });
        }
      }
    }

    // Mark recording as having embeddings generated
    await supabase
      .from('meeting_recordings_extended')
      .update({
        embeddings_generated: true,
        embeddings_generated_at: new Date().toISOString(),
      })
      .eq('id', recordingId);

    const duration = Date.now() - startTime;
    console.log(`[EmbedMeeting] ✅ Completed in ${duration}ms - ${results.filter(r => r.success).length}/${results.length} embeddings generated`);

    return new Response(
      JSON.stringify({ 
        success: true,
        recordingId,
        results,
        stats: {
          total: results.length,
          successful: results.filter(r => r.success).length,
          duration_ms: duration,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[EmbedMeeting] ❌ Error:', errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
