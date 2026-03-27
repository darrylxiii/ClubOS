import { createHandler } from '../_shared/handler.ts';

Deno.serve(createHandler(async (req, ctx) => {
  const { meetingId } = await req.json();

  if (!meetingId) {
    throw new Error('Meeting ID is required');
  }

  const googleApiKey = Deno.env.get('GOOGLE_API_KEY')!;
  const supabase = ctx.supabase;

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

    console.log('[Extract Candidate Performance] Analyzing interview via Google Gemini...');

    // Call Google Gemini API instead of OpenAI directly
    const aiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${googleApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
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
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`AI gateway error (${aiResponse.status}): ${errorText}`);
    }

    const aiResult = await aiResponse.json();
    const rawContent = aiResult.choices[0].message.content;
    
    // Parse JSON from response, handling potential markdown code blocks
    let performance;
    try {
      const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      performance = JSON.parse(jsonMatch ? jsonMatch[1].trim() : rawContent);
    } catch {
      performance = JSON.parse(rawContent);
    }

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

    // Auto-advance pipeline stage on strong_yes recommendation
    if (
      performance.hiring_recommendation === 'strong_yes' &&
      meeting.application_id
    ) {
      console.log('[Extract Candidate Performance] strong_yes detected — advancing pipeline stage');
      
      // Get current application
      const { data: application } = await supabase
        .from('applications')
        .select('id, status, pipeline_stage')
        .eq('id', meeting.application_id)
        .single();

      if (application) {
        const stageMap: Record<string, string> = {
          'applied': 'screening',
          'screening': 'interview',
          'interview': 'final_interview',
          'final_interview': 'offer',
        };
        const nextStage = stageMap[application.pipeline_stage || ''] || null;
        
        if (nextStage) {
          await supabase
            .from('applications')
            .update({ 
              pipeline_stage: nextStage,
              updated_at: new Date().toISOString()
            })
            .eq('id', application.id);

          console.log(`[Extract Candidate Performance] Pipeline advanced: ${application.pipeline_stage} → ${nextStage}`);

          // Log activity for audit
          await supabase.from('activity_feed').insert({
            user_id: meeting.candidate_id,
            event_type: 'pipeline_auto_advanced',
            event_data: {
              application_id: application.id,
              meeting_id: meetingId,
              from_stage: application.pipeline_stage,
              to_stage: nextStage,
              reason: 'strong_yes_hiring_recommendation',
            },
            visibility: 'internal',
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, performance }),
      { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
    );
}));
