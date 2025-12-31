import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// Helper: Retry with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  context: string,
  maxRetries = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[${context}] Attempt ${attempt}/${maxRetries} failed:`, lastError.message);
      
      if (attempt < maxRetries) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`[${context}] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// Helper: Update recording status with error handling
async function updateRecordingStatus(
  supabase: any,
  recordingId: string,
  updates: Record<string, unknown>
) {
  const { error } = await supabase
    .from('meeting_recordings_extended')
    .update({
      ...updates,
      last_analysis_attempt: new Date().toISOString()
    })
    .eq('id', recordingId);
    
  if (error) {
    console.error('[Recording Status] Failed to update:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  let recordingId: string | null = null;

  try {
    const body = await req.json();
    recordingId = body.recordingId;
    
    if (!recordingId) {
      throw new Error('recordingId is required');
    }

    console.log(`[Analysis] 🚀 Starting analysis for recording: ${recordingId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    if (!lovableApiKey) {
      console.error('[Analysis] ❌ LOVABLE_API_KEY not configured');
      throw new Error('AI service not configured. Please add LOVABLE_API_KEY to secrets.');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch recording details with retry
    const recording = await withRetry(async () => {
      const { data, error } = await supabase
        .from('meeting_recordings_extended')
        .select(`
          *,
          meetings(
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
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error(`Recording not found: ${recordingId}`);
      return data;
    }, 'Fetch Recording');

    // Increment retry count and update status
    const currentRetryCount = (recording.analysis_retry_count || 0) + 1;
    await updateRecordingStatus(supabase, recordingId, {
      analysis_status: 'processing',
      processing_status: 'processing',
      analysis_retry_count: currentRetryCount
    });

    console.log(`[Analysis] 📊 Recording fetched. Retry count: ${currentRetryCount}`);
    
    // Handle case where meeting might not exist
    const meetingData = recording.meetings || {
      title: 'Meeting Recording',
      meeting_type: 'general',
      candidate_id: null,
      job_id: null,
      application_id: null,
      scheduled_start: null,
      scheduled_end: null
    };

    // Get context data with individual error handling
    let candidateName = '';
    let jobTitle = '';
    let companyName = '';
    
    if (recording.candidate_id) {
      try {
        const { data: candidate } = await supabase
          .from('candidate_profiles')
          .select('first_name, last_name')
          .eq('id', recording.candidate_id)
          .maybeSingle();
        
        if (candidate) {
          candidateName = `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim();
        }
      } catch (err) {
        console.warn('[Analysis] Could not fetch candidate info:', err);
      }
    }
    
    if (recording.job_id) {
      try {
        const { data: job } = await supabase
          .from('jobs')
          .select('title, companies(name)')
          .eq('id', recording.job_id)
          .maybeSingle();
        
        if (job) {
          jobTitle = job.title || '';
          const companies = job.companies as { name?: string } | null;
          companyName = companies?.name || '';
        }
      } catch (err) {
        console.warn('[Analysis] Could not fetch job info:', err);
      }
    }

    // Validate transcript
    const transcript = recording.transcript || '';
    if (!transcript || transcript.length < 50) {
      console.warn('[Analysis] ⚠️ Transcript is missing or too short:', transcript.length, 'chars');
      
      // Still proceed with analysis but note it
      await updateRecordingStatus(supabase, recordingId, {
        processing_error: 'Transcript unavailable or too short for detailed analysis'
      });
    }

    const durationMinutes = Math.round((recording.duration_seconds || 1800) / 60);

    console.log(`[Analysis] 📝 Context: Candidate=${candidateName || 'Unknown'}, Job=${jobTitle || 'N/A'}, Duration=${durationMinutes}min, Transcript=${transcript.length} chars`);

    // Enhanced AI analysis prompt
    const analysisPrompt = `You are an expert interview analyst for a luxury executive search firm.

Meeting Context:
${candidateName ? `- Candidate: ${candidateName}` : '- Candidate: Unknown participant'}
${jobTitle ? `- Position: ${jobTitle}${companyName ? ` at ${companyName}` : ''}` : '- Position: General interview'}
- Meeting Type: ${meetingData.meeting_type || 'general'}
- Duration: ${durationMinutes} minutes

Full Transcript:
${transcript || 'No transcript available - please analyze based on available context only.'}

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
1. Quote exact phrases from transcript as evidence where available
2. Include timestamps for all key moments (format: MM:SS)
3. Be brutally honest about red flags (this is internal only)
4. Provide actionable next steps, not generic advice
5. Identify ANY compensation/availability mismatches with job requirements
6. Return ONLY valid JSON, no markdown formatting
7. If transcript is unavailable, provide best-effort analysis based on meeting metadata`;

    // Call Lovable AI with retry
    console.log('[Analysis] 🤖 Calling AI service...');
    
    const aiResponse = await withRetry(async () => {
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
          max_tokens: 4000
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // Handle rate limits specifically
        if (response.status === 429) {
          throw new Error('AI service rate limited. Please try again later.');
        }
        if (response.status === 402) {
          throw new Error('AI service credits exhausted. Please add credits to continue.');
        }
        
        throw new Error(`AI analysis failed (${response.status}): ${errorText}`);
      }

      return response.json();
    }, 'AI Analysis', 2);

    const aiContent = aiResponse.choices?.[0]?.message?.content || '{}';
    console.log('[Analysis] 📄 AI response received:', aiContent.substring(0, 200) + '...');
    
    // Parse AI response with fallback
    let aiAnalysis;
    try {
      // Remove markdown code blocks if present
      const cleanedContent = aiContent
        .replace(/```json\n?/g, '')
        .replace(/\n?```/g, '')
        .trim();
      aiAnalysis = JSON.parse(cleanedContent);
      console.log('[Analysis] ✅ AI response parsed successfully');
    } catch (parseError) {
      console.error('[Analysis] ⚠️ Failed to parse AI response, using fallback:', parseError);
      aiAnalysis = {
        executiveSummary: 'Analysis completed but response parsing failed. Raw analysis available in logs.',
        candidateEvaluation: { 
          overallFit: 'pending', 
          confidenceLevel: 'low',
          strengths: [],
          weaknesses: [],
          skillsAssessment: []
        },
        decisionGuidance: { 
          recommendation: 'maybe', 
          nextSteps: ['Review recording manually'],
          followUpQuestions: [],
          riskFactors: [],
          dealBreakers: []
        },
        actionItems: [{
          owner: 'Strategist',
          task: 'Review recording manually due to parsing error',
          priority: 'high',
          category: 'follow_up'
        }],
        keyMoments: [],
        _rawResponse: aiContent.substring(0, 500),
        _parseError: String(parseError)
      };
    }

    // Update recording with analysis
    await updateRecordingStatus(supabase, recordingId, {
      ai_summary: aiAnalysis,
      ai_analysis: aiAnalysis,
      executive_summary: aiAnalysis.executiveSummary || null,
      action_items: aiAnalysis.actionItems || [],
      key_moments: aiAnalysis.keyMoments || [],
      analysis_status: 'completed',
      processing_status: 'completed',
      analyzed_at: new Date().toISOString(),
      processing_error: null
    });

    console.log('[Analysis] 💾 Recording updated with analysis');

    // Distribute to candidate/job profiles (with error handling)
    if (recording.candidate_id) {
      try {
        await supabase.from('candidate_interview_recordings').insert({
          candidate_id: recording.candidate_id,
          recording_id: recordingId,
          meeting_id: recording.meeting_id,
          job_title: jobTitle || 'Interview',
          company_name: companyName || null,
          interview_date: meetingData.scheduled_start || recording.created_at,
          overall_score: aiAnalysis.candidateEvaluation?.overallFit || 'pending',
          recommendation: aiAnalysis.decisionGuidance?.recommendation || 'pending'
        });
        console.log('[Analysis] 📋 Candidate recording link created');
      } catch (err) {
        console.warn('[Analysis] Could not link to candidate profile:', err);
      }
    }

    if (recording.job_id) {
      try {
        await supabase.from('job_interview_recordings').insert({
          job_id: recording.job_id,
          recording_id: recordingId,
          meeting_id: recording.meeting_id,
          candidate_name: candidateName || 'Candidate',
          candidate_id: recording.candidate_id || null,
          interview_stage: meetingData.meeting_type || 'interview',
          overall_score: aiAnalysis.candidateEvaluation?.overallFit || 'pending',
          recommendation: aiAnalysis.decisionGuidance?.recommendation || 'pending'
        });
        console.log('[Analysis] 📋 Job recording link created');
      } catch (err) {
        console.warn('[Analysis] Could not link to job profile:', err);
      }
    }

    // Create tasks from action items
    if (aiAnalysis.actionItems && Array.isArray(aiAnalysis.actionItems) && aiAnalysis.actionItems.length > 0) {
      try {
        const tasks = aiAnalysis.actionItems.slice(0, 5).map((item: Record<string, unknown>) => ({
          title: String(item.task || 'Follow up task'),
          description: `From meeting: ${meetingData.title || 'Interview'}`,
          priority: String(item.priority || 'medium'),
          status: 'todo',
          user_id: recording.host_id,
          category: String(item.category || 'follow_up')
        }));

        await supabase.from('unified_tasks').insert(tasks);
        console.log(`[Analysis] ✅ Created ${tasks.length} tasks from action items`);
      } catch (err) {
        console.warn('[Analysis] Could not create tasks:', err);
      }
    }

    // Log to audit table
    try {
      await supabase.from('meeting_data_audit').insert({
        meeting_id: recording.meeting_id,
        recording_id: recordingId,
        check_type: 'ai_analysis',
        passed: true,
        details: {
          duration_ms: Date.now() - startTime,
          transcript_length: transcript.length,
          retry_count: currentRetryCount,
          has_candidate_link: !!recording.candidate_id,
          has_job_link: !!recording.job_id
        }
      });
    } catch (err) {
      console.warn('[Analysis] Could not log to audit table:', err);
    }

    const totalTime = Date.now() - startTime;
    console.log(`[Analysis] ✅ Recording analysis completed in ${totalTime}ms:`, recordingId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis: aiAnalysis,
        stats: {
          duration_ms: totalTime,
          transcript_chars: transcript.length,
          retry_count: currentRetryCount
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('[Analysis] ❌ Error analyzing recording:', errorMessage);

    // Update status to failed if we have a recordingId
    if (recordingId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        await supabase
          .from('meeting_recordings_extended')
          .update({
            analysis_status: 'failed',
            processing_status: 'failed',
            processing_error: errorMessage,
            last_analysis_attempt: new Date().toISOString()
          })
          .eq('id', recordingId);

        // Log failure to audit
        const { data: recording } = await supabase
          .from('meeting_recordings_extended')
          .select('meeting_id')
          .eq('id', recordingId)
          .single();

        if (recording?.meeting_id) {
          await supabase.from('meeting_data_audit').insert({
            meeting_id: recording.meeting_id,
            recording_id: recordingId,
            check_type: 'ai_analysis',
            passed: false,
            details: {
              error: errorMessage,
              duration_ms: Date.now() - startTime
            }
          });
        }
      } catch (updateErr) {
        console.error('[Analysis] Failed to update error status:', updateErr);
      }
    }

    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        recordingId,
        canRetry: !errorMessage.includes('credits exhausted')
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
