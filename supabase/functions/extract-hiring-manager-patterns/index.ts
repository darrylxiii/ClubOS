import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Get meeting details
    const { data: meeting } = await supabase
      .from('meetings')
      .select('*, meeting_transcripts(*)')
      .eq('id', meetingId)
      .single();

    if (!meeting || !meeting.meeting_transcripts?.length) {
      throw new Error('Meeting or transcripts not found');
    }

    // Combine all transcripts
    const fullTranscript = meeting.meeting_transcripts
      .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .map((t: any) => `${t.speaker_name}: ${t.transcript_text}`)
      .join('\n');

    console.log('[Extract Hiring Manager] Analyzing transcript...');

    // Call AI to extract hiring manager patterns
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
            content: `You are an expert interviewer analyst. Extract hiring manager patterns from interview transcripts.
Return a JSON object with:
{
  "questions_asked": [{"question": "text", "category": "behavioral|technical|situational", "timestamp": ""}],
  "response_patterns": [{"pattern": "description", "sentiment": "positive|negative|neutral"}],
  "decision_signals": [{"signal": "text", "implication": "high_interest|low_interest|neutral"}],
  "cultural_priorities": ["value1", "value2"],
  "interview_style": "conversational|formal|technical|structured",
  "focus_areas": ["area1", "area2"],
  "communication_style": "direct|supportive|challenging"
}`
          },
          {
            role: 'user',
            content: `Analyze this interview transcript:\n\n${fullTranscript}`
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
    const analysis = JSON.parse(aiResult.choices[0].message.content);

    console.log('[Extract Hiring Manager] Analysis complete:', analysis);

    // Store hiring manager profile or update existing
    if (meeting.host_id && meeting.company_id) {
      const { data: existingProfile } = await supabase
        .from('hiring_manager_profiles')
        .select('*')
        .eq('user_id', meeting.host_id)
        .single();

      if (existingProfile) {
        // Merge with existing data
        const updatedCommonQuestions = [
          ...existingProfile.common_questions || [],
          ...analysis.questions_asked || []
        ];

        await supabase
          .from('hiring_manager_profiles')
          .update({
            interview_style: analysis.interview_style,
            common_questions: updatedCommonQuestions,
            decision_patterns: analysis.decision_signals || [],
            cultural_priorities: analysis.cultural_priorities || [],
            communication_style: analysis.communication_style,
            focus_areas: analysis.focus_areas || [],
            meetings_analyzed: (existingProfile.meetings_analyzed || 0) + 1,
            last_analyzed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingProfile.id);
      } else {
        // Create new profile
        await supabase
          .from('hiring_manager_profiles')
          .insert({
            user_id: meeting.host_id,
            company_id: meeting.company_id,
            interview_style: analysis.interview_style,
            common_questions: analysis.questions_asked || [],
            decision_patterns: analysis.decision_signals || [],
            cultural_priorities: analysis.cultural_priorities || [],
            communication_style: analysis.communication_style,
            focus_areas: analysis.focus_areas || [],
            meetings_analyzed: 1,
            last_analyzed_at: new Date().toISOString()
          });
      }
    }

    // Store individual question patterns
    for (const q of analysis.questions_asked || []) {
      await supabase
        .from('interview_question_patterns')
        .insert({
          company_id: meeting.company_id,
          job_id: meeting.job_id,
          interviewer_name: meeting.host_id,
          question_text: q.question,
          question_category: q.category,
          frequency: 1,
          extracted_from_meeting_id: meetingId
        });
    }

    // Mark processing as complete
    await supabase
      .from('meeting_intelligence_processing')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result_data: analysis
      })
      .eq('meeting_id', meetingId)
      .eq('processing_type', 'hiring_manager_patterns');

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Extract Hiring Manager] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
