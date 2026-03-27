import { createHandler } from '../_shared/handler.ts';

Deno.serve(createHandler(async (req, ctx) => {
    const corsHeaders = ctx.corsHeaders;
    const supabase = ctx.supabase;
    const googleApiKey = Deno.env.get('GOOGLE_API_KEY')!;

    const { meeting_id } = await req.json();
    console.log('Analyzing transcript for meeting:', meeting_id);

    const startTime = Date.now();

    // Fetch all final transcript chunks
    const { data: transcripts, error: transcriptError } = await supabase
      .from('meeting_transcripts')
      .select('*')
      .eq('meeting_id', meeting_id)
      .eq('is_final', true)
      .order('timestamp_ms', { ascending: true });

    if (transcriptError) {
      throw new Error(`Failed to fetch transcripts: ${transcriptError.message}`);
    }

    if (!transcripts || transcripts.length === 0) {
      console.log('No transcripts found for meeting');
      return new Response(
        JSON.stringify({ success: false, message: 'No transcripts found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Construct full transcript with timestamps and speakers
    const formatTime = (ms: number) => {
      const totalSeconds = Math.floor(ms / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const fullTranscript = transcripts
      .map(t => `[${formatTime(t.timestamp_ms)}] ${t.participant_name || 'Unknown'}: ${t.text}`)
      .join('\n');

    console.log('Full transcript length:', fullTranscript.length, 'characters');

    // Call Google Gemini for analysis
    const analysisPrompt = `You are an expert meeting analyst for The Quantum Club, a luxury talent platform. Analyze this meeting transcript and extract structured insights.

Meeting Transcript:
${fullTranscript}

Extract and return the following in JSON format:
{
  "summary": "2-3 sentence executive summary",
  "key_points": ["array", "of", "key", "discussion", "points"],
  "action_items": [
    {
      "owner": "person responsible",
      "task": "specific task description",
      "priority": "low|medium|high"
    }
  ],
  "decisions": ["array", "of", "key", "decisions", "made"],
  "questions_asked": ["unanswered", "questions", "raised"],
  "sentiment": "positive|neutral|negative",
  "topics": ["main", "topics", "discussed"]
}

Be concise, professional, and focus on actionable insights.`;

    const aiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${googleApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: 'You are a meeting analysis expert. Always respond with valid JSON.' },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.7
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`AI analysis failed: ${aiResponse.status} - ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const analysisText = aiData.choices[0].message.content;
    
    // Extract JSON from markdown code blocks if present
    let insights;
    try {
      const jsonMatch = analysisText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : analysisText;
      insights = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', analysisText);
      throw new Error('AI returned invalid JSON format');
    }

    console.log('Analysis complete, saving insights');

    // Get bot session ID
    const { data: botSession } = await supabase
      .from('meeting_bot_sessions')
      .select('id')
      .eq('meeting_id', meeting_id)
      .order('joined_at', { ascending: false })
      .limit(1)
      .single();

    // Calculate participants summary
    const participantStats: Record<string, number> = {};
    transcripts.forEach(t => {
      const name = t.participant_name || 'Unknown';
      participantStats[name] = (participantStats[name] || 0) + 1;
    });

    const totalMessages = transcripts.length;
    const participantsSummary = Object.entries(participantStats).map(([name, count]) => ({
      name,
      message_count: count,
      percentage: Math.round((count / totalMessages) * 100)
    }));

    // Save insights to database
    const { data: savedInsights, error: insightError } = await supabase
      .from('meeting_insights')
      .insert({
        meeting_id,
        bot_session_id: botSession?.id,
        summary: insights.summary,
        key_points: insights.key_points,
        action_items: insights.action_items || [],
        decisions: insights.decisions || [],
        topics: insights.topics || [],
        questions_asked: insights.questions_asked || [],
        sentiment_analysis: { overall: insights.sentiment || 'neutral' },
        participants_summary: participantsSummary,
        full_transcript: fullTranscript,
        analysis_status: 'completed',
        processing_time_ms: Date.now() - startTime
      })
      .select()
      .single();

    if (insightError) {
      throw new Error(`Failed to save insights: ${insightError.message}`);
    }

    // Create tasks from action items
    if (insights.action_items && Array.isArray(insights.action_items)) {
      for (const item of insights.action_items) {
        await supabase.from('unified_tasks').insert({
          title: item.task,
          priority: item.priority || 'medium',
          category: 'meeting_followup',
          metadata: {
            meeting_id,
            action_item_owner: item.owner,
            source: 'club_ai_notetaker'
          }
        });
      }
      console.log('Created', insights.action_items.length, 'tasks from action items');
    }

    return new Response(
      JSON.stringify({
        success: true,
        insights_id: savedInsights.id,
        action_items_count: insights.action_items?.length || 0,
        processing_time_ms: Date.now() - startTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
}));
