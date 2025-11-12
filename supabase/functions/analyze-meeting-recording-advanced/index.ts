import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { recordingId } = await req.json();
    
    if (!recordingId) {
      throw new Error('recordingId is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch recording details
    const { data: recording, error: recordingError } = await supabase
      .from('meeting_recordings_extended')
      .select(`
        *,
        meetings!inner(
          title,
          meeting_type,
          candidate_id,
          job_id,
          application_id,
          scheduled_start,
          scheduled_end
        )
      `)
      .eq('id', recordingId)
      .single();

    if (recordingError) throw recordingError;

    // Update status to processing
    await supabase
      .from('meeting_recordings_extended')
      .update({ analysis_status: 'processing' })
      .eq('id', recordingId);

    // Get context data
    let candidateName = '';
    let jobTitle = '';
    let companyName = '';
    
    if (recording.candidate_id) {
      const { data: candidate } = await supabase
        .from('candidate_profiles')
        .select('first_name, last_name')
        .eq('id', recording.candidate_id)
        .single();
      
      if (candidate) {
        candidateName = `${candidate.first_name} ${candidate.last_name}`.trim();
      }
    }
    
    if (recording.job_id) {
      const { data: job } = await supabase
        .from('jobs')
        .select('title, companies(name)')
        .eq('id', recording.job_id)
        .single();
      
      if (job && job.companies) {
        jobTitle = job.title;
        const companies = job.companies as any;
        companyName = companies.name || '';
      }
    }

    const transcript = recording.transcript || 'No transcript available';
    const durationMinutes = Math.round(recording.duration_seconds / 60) || 30;

    // Enhanced AI analysis prompt
    const analysisPrompt = `You are an expert interview analyst for a luxury executive search firm.

Meeting Context:
${candidateName ? `- Candidate: ${candidateName}` : ''}
${jobTitle ? `- Position: ${jobTitle}${companyName ? ` at ${companyName}` : ''}` : ''}
- Meeting Type: ${recording.meetings.meeting_type || 'general'}
- Duration: ${durationMinutes} minutes

Full Transcript:
${transcript}

Generate a comprehensive interview intelligence report in JSON format:

{
  "executiveSummary": "2-3 sentences capturing essence of interview",
  
  "candidateEvaluation": {
    "overallFit": "poor|fair|good|excellent",
    "confidenceLevel": "low|medium|high",
    "skillsAssessment": [
      {
        "skill": "Technical skill name",
        "demonstrated": "yes|no|partially",
        "evidence": "Specific example from transcript",
        "rating": 3
      }
    ],
    "cultureFitSignals": {
      "positive": ["list", "of", "signals"],
      "concerns": ["list", "of", "concerns"]
    },
    "communicationStyle": "Clear articulation, active listening, etc.",
    "redFlags": [
      {
        "type": "compensation|experience|attitude|availability",
        "severity": "low|medium|high|critical",
        "description": "Detailed concern",
        "timestamp": "00:00"
      }
    ],
    "strengths": ["Notable strength 1", "strength 2"],
    "weaknesses": ["Area for concern 1", "concern 2"]
  },
  
  "interviewQuality": {
    "questionDepth": "shallow|adequate|deep",
    "candidateEngagement": "low|medium|high",
    "interviewerPerformance": "Feedback for interviewer"
  },
  
  "decisionGuidance": {
    "recommendation": "strong_no|no|maybe|yes|strong_yes",
    "nextSteps": ["Action 1", "Action 2"],
    "followUpQuestions": ["Question 1 to ask in next round"],
    "riskFactors": ["Risk 1", "Risk 2"],
    "dealBreakers": []
  },
  
  "actionItems": [
    {
      "owner": "Person responsible",
      "task": "Specific action",
      "deadline": "Within 3 days",
      "priority": "low|medium|high|urgent",
      "category": "follow_up|internal_discussion|reference_check|offer_prep"
    }
  ],
  
  "keyMoments": [
    {
      "timestamp": "00:00",
      "type": "red_flag|great_answer|cultural_alignment|technical_depth",
      "description": "What happened",
      "quote": "Exact candidate quote if relevant"
    }
  ],
  
  "followUpEmail": {
    "subject": "Professional subject line",
    "body": "Warm, personalized email thanking candidate"
  },
  
  "salaryExpectations": {
    "mentioned": false,
    "range": null,
    "negotiability": "unclear",
    "timestamp": null
  },
  
  "noticePeriod": {
    "mentioned": false,
    "duration": null,
    "constraints": null
  },
  
  "comparisonData": {
    "strengthsVsOthers": ["What makes this candidate stand out"],
    "weaknessesVsOthers": ["Where others are stronger"]
  }
}

CRITICAL REQUIREMENTS:
1. Quote exact phrases from transcript as evidence
2. Include timestamps for all key moments (format: MM:SS)
3. Be brutally honest about red flags (this is internal only)
4. Provide actionable next steps, not generic advice
5. Identify ANY compensation/availability mismatches with job requirements
6. Return ONLY valid JSON, no markdown formatting`;

    // Call Lovable AI
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an expert interview analyst. Return only valid JSON.' },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', errorText);
      throw new Error(`AI analysis failed: ${errorText}`);
    }

    const aiResponse = await response.json();
    const aiContent = aiResponse.choices[0]?.message?.content || '{}';
    
    // Parse AI response
    let aiAnalysis;
    try {
      // Remove markdown code blocks if present
      const cleanedContent = aiContent.replace(/```json\n?|\n?```/g, '').trim();
      aiAnalysis = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiContent);
      aiAnalysis = {
        executiveSummary: 'Analysis completed but formatting error occurred',
        candidateEvaluation: { overallFit: 'fair', confidenceLevel: 'low' },
        decisionGuidance: { recommendation: 'maybe', nextSteps: [] },
        actionItems: [],
        keyMoments: []
      };
    }

    // Update recording with analysis
    await supabase
      .from('meeting_recordings_extended')
      .update({
        ai_summary: aiAnalysis,
        analysis_status: 'completed',
        analyzed_at: new Date().toISOString()
      })
      .eq('id', recordingId);

    // Distribute to correct profiles
    if (recording.candidate_id) {
      await supabase.from('candidate_interview_recordings').insert({
        candidate_id: recording.candidate_id,
        recording_id: recordingId,
        meeting_id: recording.meeting_id,
        job_title: jobTitle || 'Interview',
        company_name: companyName,
        interview_date: recording.meetings.scheduled_start,
        overall_score: aiAnalysis.candidateEvaluation?.overallFit || 'pending',
        recommendation: aiAnalysis.decisionGuidance?.recommendation || 'pending'
      });
    }

    if (recording.job_id) {
      await supabase.from('job_interview_recordings').insert({
        job_id: recording.job_id,
        recording_id: recordingId,
        meeting_id: recording.meeting_id,
        candidate_name: candidateName || 'Candidate',
        candidate_id: recording.candidate_id,
        interview_stage: recording.meetings.meeting_type || 'interview',
        overall_score: aiAnalysis.candidateEvaluation?.overallFit || 'pending',
        recommendation: aiAnalysis.decisionGuidance?.recommendation || 'pending'
      });
    }

    // Create tasks from action items
    if (aiAnalysis.actionItems && Array.isArray(aiAnalysis.actionItems)) {
      const tasks = aiAnalysis.actionItems.map((item: any) => ({
        title: item.task,
        description: `From meeting: ${recording.meetings.title}`,
        priority: item.priority || 'medium',
        status: 'todo',
        user_id: recording.host_id,
        category: item.category || 'follow_up'
      }));

      if (tasks.length > 0) {
        await supabase.from('unified_tasks').insert(tasks);
      }
    }

    console.log('✅ Recording analysis completed:', recordingId);

    return new Response(
      JSON.stringify({ success: true, analysis: aiAnalysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error analyzing recording:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
