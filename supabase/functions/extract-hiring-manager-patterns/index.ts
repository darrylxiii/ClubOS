import { createHandler } from '../_shared/handler.ts';

Deno.serve(createHandler(async (req, ctx) => {
  const { meetingId } = await req.json();

  if (!meetingId) {
    throw new Error('Meeting ID is required');
  }

  const googleApiKey = Deno.env.get('GOOGLE_API_KEY')!;
  const supabase = ctx.supabase;

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

    console.log('[Extract Hiring Manager] Analyzing transcript via Google Gemini...');

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
    let analysis;
    try {
      const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      analysis = JSON.parse(jsonMatch ? jsonMatch[1].trim() : rawContent);
    } catch {
      analysis = JSON.parse(rawContent);
    }

    console.log('[Extract Hiring Manager] Analysis complete');

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
      { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
    );
}));
