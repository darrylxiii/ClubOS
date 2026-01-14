import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { publicCorsHeaders } from "../_shared/cors-config.ts";

const corsHeaders = publicCorsHeaders;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { meetingId } = await req.json();

    if (!meetingId) {
      throw new Error('Meeting ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get meeting details with transcripts and job description
    const { data: meeting } = await supabase
      .from('meetings')
      .select(`
        *,
        meeting_transcripts(*),
        jobs(title, description, requirements)
      `)
      .eq('id', meetingId)
      .single();

    if (!meeting || !meeting.meeting_transcripts?.length || !meeting.candidate_id) {
      throw new Error('Meeting, transcripts, or candidate info not found');
    }

    // Get candidate profile
    const { data: candidate } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('id', meeting.candidate_id)
      .single();

    // Combine all transcripts
    const fullTranscript = meeting.meeting_transcripts
      .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .map((t: any) => `${t.speaker_name}: ${t.transcript_text}`)
      .join('\n');

    console.log('[Extract Candidate Performance] Analyzing interview...');

    // Call AI to assess candidate performance
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert interview analyst and career coach. Assess candidate performance objectively.
Return a JSON object with:
{
  "communication_quality": {
    "clarity": 0.0-1.0,
    "conciseness": 0.0-1.0,
    "confidence": 0.0-1.0
  },
  "technical_competence": 0.0-1.0,
  "cultural_fit": 0.0-1.0,
  "answer_quality": [
    {
      "question": "question text",
      "response_strength": "strong|adequate|weak",
      "evidence": "specific examples from transcript"
    }
  ],
  "red_flags": ["flag1", "flag2"],
  "green_flags": ["strength1", "strength2"],
  "coaching_suggestions": ["suggestion1", "suggestion2"],
  "key_strengths": ["strength1", "strength2"],
  "areas_for_improvement": ["area1", "area2"],
  "overall_impression": "detailed summary",
  "hiring_recommendation": "strong_yes|yes|maybe|no|strong_no"
}`
          },
          {
            role: 'user',
            content: `Analyze this candidate's interview performance:

Job: ${meeting.jobs?.title || 'Unknown'}
Job Requirements: ${meeting.jobs?.requirements || 'N/A'}

Candidate Background:
- Experience: ${candidate?.years_of_experience || 'N/A'} years
- Current Role: ${candidate?.current_role || 'N/A'}

Interview Transcript:
${fullTranscript}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`OpenAI API error: ${await aiResponse.text()}`);
    }

    const aiResult = await aiResponse.json();
    const performance = JSON.parse(aiResult.choices[0].message.content);

    console.log('[Extract Candidate Performance] Assessment complete');

    // Store candidate interview performance
    await supabase
      .from('candidate_interview_performance')
      .insert({
        candidate_id: meeting.candidate_id,
        meeting_id: meetingId,
        application_id: meeting.application_id,
        communication_clarity_score: performance.communication_quality.clarity,
        communication_conciseness_score: performance.communication_quality.conciseness,
        communication_confidence_score: performance.communication_quality.confidence,
        technical_competence_score: performance.technical_competence,
        cultural_fit_score: performance.cultural_fit,
        answer_quality: performance.answer_quality || [],
        red_flags: performance.red_flags || [],
        green_flags: performance.green_flags || [],
        coaching_suggestions: performance.coaching_suggestions || [],
        key_strengths: performance.key_strengths || [],
        areas_for_improvement: performance.areas_for_improvement || [],
        overall_impression: performance.overall_impression,
        hiring_recommendation: performance.hiring_recommendation
      });

    // Mark processing as complete
    await supabase
      .from('meeting_intelligence_processing')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result_data: performance
      })
      .eq('meeting_id', meetingId)
      .eq('processing_type', 'candidate_performance');

    return new Response(
      JSON.stringify({ success: true, performance }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Extract Candidate Performance] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
