import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const TRANSCRIPT_CHUNK_SIZE = 15000; // Characters per chunk for long transcripts
const AI_TIMEOUT_MS = 60000; // 60 second timeout for AI calls

// ============================================================================
// Circuit Breaker Pattern (in-memory for edge function)
// ============================================================================
interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

const circuitBreakers: Map<string, CircuitBreakerState> = new Map();
const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_RESET_TIMEOUT_MS = 30000;

function getCircuitBreaker(name: string): CircuitBreakerState {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, { failures: 0, lastFailure: 0, isOpen: false });
  }
  return circuitBreakers.get(name)!;
}

function checkCircuit(name: string): boolean {
  const cb = getCircuitBreaker(name);
  
  // Check if circuit should be reset (half-open)
  if (cb.isOpen && Date.now() - cb.lastFailure > CIRCUIT_RESET_TIMEOUT_MS) {
    console.log(`[CircuitBreaker] ${name}: Transitioning to half-open`);
    cb.isOpen = false;
    cb.failures = 0;
  }
  
  return !cb.isOpen;
}

function recordSuccess(name: string) {
  const cb = getCircuitBreaker(name);
  cb.failures = 0;
  cb.isOpen = false;
}

function recordFailure(name: string) {
  const cb = getCircuitBreaker(name);
  cb.failures++;
  cb.lastFailure = Date.now();
  
  if (cb.failures >= CIRCUIT_FAILURE_THRESHOLD) {
    console.log(`[CircuitBreaker] ${name}: Opening circuit after ${cb.failures} failures`);
    cb.isOpen = true;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

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

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  context: string
): Promise<T> {
  let timeoutId: number | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${context} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

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

// Chunk long transcripts into smaller pieces
function chunkTranscript(transcript: string, maxChunkSize: number = TRANSCRIPT_CHUNK_SIZE): string[] {
  if (transcript.length <= maxChunkSize) {
    return [transcript];
  }

  const chunks: string[] = [];
  const lines = transcript.split('\n');
  let currentChunk = '';

  for (const line of lines) {
    if (currentChunk.length + line.length + 1 > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = line;
    } else {
      currentChunk += (currentChunk ? '\n' : '') + line;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  console.log(`[Chunking] Split ${transcript.length} chars into ${chunks.length} chunks`);
  return chunks;
}

// ============================================================================
// AI Analysis Functions
// ============================================================================

async function callPrimaryAI(
  lovableApiKey: string,
  prompt: string
): Promise<any> {
  const circuitName = 'primary-ai';
  
  if (!checkCircuit(circuitName)) {
    throw new Error('Primary AI circuit is open - too many recent failures');
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

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
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 429) {
        throw new Error('AI service rate limited');
      }
      if (response.status === 402) {
        throw new Error('AI service credits exhausted');
      }
      throw new Error(`AI analysis failed (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    recordSuccess(circuitName);
    return result;
  } catch (error) {
    recordFailure(circuitName);
    throw error;
  }
}

async function callFallbackAI(
  lovableApiKey: string,
  prompt: string
): Promise<any> {
  console.log('[AI] Using fallback model (flash-lite) for simplified analysis');
  
  // Simplified prompt for faster, cheaper model
  const simplifiedPrompt = prompt.replace(
    /Generate a comprehensive interview intelligence report/,
    'Generate a brief interview summary'
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-lite', // Faster, cheaper fallback
      messages: [
        { role: 'system', content: 'You are a helpful assistant. Return only valid JSON.' },
        { role: 'user', content: simplifiedPrompt }
      ],
      temperature: 0.5,
      max_tokens: 2000
    }),
    signal: controller.signal
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Fallback AI failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

async function analyzeWithFallback(
  lovableApiKey: string,
  prompt: string
): Promise<{ response: any; usedFallback: boolean }> {
  try {
    const response = await withRetry(
      () => callPrimaryAI(lovableApiKey, prompt),
      'Primary AI',
      2
    );
    return { response, usedFallback: false };
  } catch (primaryError) {
    console.warn('[AI] Primary analysis failed, attempting fallback:', primaryError);
    
    try {
      const response = await callFallbackAI(lovableApiKey, prompt);
      return { response, usedFallback: true };
    } catch (fallbackError) {
      console.error('[AI] Fallback also failed:', fallbackError);
      // Re-throw the original error as it's more informative
      throw primaryError;
    }
  }
}

// Summarize chunks for very long transcripts
async function summarizeChunk(
  lovableApiKey: string,
  chunk: string,
  chunkIndex: number,
  totalChunks: number
): Promise<string> {
  console.log(`[Chunking] Summarizing chunk ${chunkIndex + 1}/${totalChunks}`);
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-lite',
      messages: [
        { role: 'system', content: 'Extract key points and quotes from this transcript section. Be concise but preserve important details and exact quotes.' },
        { role: 'user', content: chunk }
      ],
      max_tokens: 1000
    }),
  });

  if (!response.ok) {
    throw new Error(`Chunk summarization failed: ${response.status}`);
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content || chunk.substring(0, 1000);
}

async function processLongTranscript(
  lovableApiKey: string,
  transcript: string
): Promise<string> {
  const chunks = chunkTranscript(transcript);
  
  if (chunks.length <= 1) {
    return transcript;
  }

  console.log(`[Chunking] Processing ${chunks.length} chunks for long transcript`);
  
  // Summarize each chunk in parallel (with limit)
  const summaries = await Promise.all(
    chunks.slice(0, 5).map((chunk, i) => // Limit to 5 chunks to avoid timeout
      summarizeChunk(lovableApiKey, chunk, i, Math.min(chunks.length, 5))
        .catch(err => {
          console.warn(`[Chunking] Failed to summarize chunk ${i}:`, err);
          return `[Chunk ${i + 1}]: ${chunk.substring(0, 500)}...`;
        })
    )
  );

  return summaries.join('\n\n---\n\n');
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  let recordingId: string | null = null;
  let isReanalysis = false;

  try {
    const body = await req.json();
    recordingId = body.recordingId;
    isReanalysis = body.reanalyze === true;
    
    if (!recordingId) {
      throw new Error('recordingId is required');
    }

    console.log(`[Analysis] 🚀 Starting analysis for recording: ${recordingId}${isReanalysis ? ' (re-analysis)' : ''}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    if (!lovableApiKey) {
      throw new Error('AI service not configured. Please add LOVABLE_API_KEY to secrets.');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Compile transcript from streaming segments (Phase 3 integration)
    console.log('[Analysis] 📝 Compiling transcript from streaming segments...');
    try {
      const compileResponse = await fetch(`${supabaseUrl}/functions/v1/compile-meeting-transcript`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recordingId })
      });

      if (compileResponse.ok) {
        const compileResult = await compileResponse.json();
        console.log('[Analysis] ✅ Transcript compiled:', compileResult.segmentCount, 'segments,', compileResult.transcriptLength, 'chars');
      } else {
        console.warn('[Analysis] ⚠️ Transcript compilation returned non-OK:', compileResponse.status);
      }
    } catch (compileErr) {
      console.warn('[Analysis] ⚠️ Could not compile transcript (continuing anyway):', compileErr);
    }

    // Step 2: Fetch recording details (will now have compiled transcript)
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
    const currentRetryCount = isReanalysis ? 0 : ((recording.analysis_retry_count || 0) + 1);
    await updateRecordingStatus(supabase, recordingId, {
      analysis_status: 'processing',
      processing_status: 'analyzing',
      analysis_retry_count: currentRetryCount
    });

    console.log(`[Analysis] 📊 Recording fetched. Retry count: ${currentRetryCount}`);
    
    const meetingData = recording.meetings || {
      title: 'Meeting Recording',
      meeting_type: 'general'
    };

    // Get context data
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

    // Process transcript (handle long transcripts with chunking)
    let transcript = recording.transcript || '';
    let transcriptNote = '';
    
    if (!transcript || transcript.length < 50) {
      console.warn('[Analysis] ⚠️ Transcript is missing or too short:', transcript.length, 'chars');
      transcriptNote = 'Note: Transcript unavailable - analysis based on metadata only.';
    } else if (transcript.length > TRANSCRIPT_CHUNK_SIZE * 3) {
      console.log('[Analysis] 📄 Long transcript detected, processing chunks...');
      try {
        transcript = await withTimeout(
          processLongTranscript(lovableApiKey, transcript),
          90000, // 90s timeout for chunking
          'Transcript Processing'
        );
        transcriptNote = 'Note: Long transcript was summarized for analysis.';
      } catch (chunkErr) {
        console.warn('[Analysis] ⚠️ Chunking failed, using truncated transcript:', chunkErr);
        transcript = transcript.substring(0, TRANSCRIPT_CHUNK_SIZE) + '\n\n[Transcript truncated due to length...]';
        transcriptNote = 'Note: Transcript was truncated due to length.';
      }
    }

    const durationMinutes = Math.round((recording.duration_seconds || 1800) / 60);

    console.log(`[Analysis] 📝 Context: Candidate=${candidateName || 'Unknown'}, Job=${jobTitle || 'N/A'}, Duration=${durationMinutes}min, Transcript=${transcript.length} chars`);

    // Build analysis prompt
    const analysisPrompt = `You are an expert interview analyst for a luxury executive search firm.

Meeting Context:
${candidateName ? `- Candidate: ${candidateName}` : '- Candidate: Unknown participant'}
${jobTitle ? `- Position: ${jobTitle}${companyName ? ` at ${companyName}` : ''}` : '- Position: General interview'}
- Meeting Type: ${meetingData.meeting_type || 'general'}
- Duration: ${durationMinutes} minutes
${transcriptNote ? `\n${transcriptNote}` : ''}

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

    // Call AI with fallback
    console.log('[Analysis] 🤖 Calling AI service...');
    
    const { response: aiResponse, usedFallback } = await withTimeout(
      analyzeWithFallback(lovableApiKey, analysisPrompt),
      AI_TIMEOUT_MS + 10000,
      'AI Analysis'
    );

    const aiContent = aiResponse.choices?.[0]?.message?.content || '{}';
    console.log('[Analysis] 📄 AI response received (fallback:', usedFallback, '):', aiContent.substring(0, 200) + '...');
    
    // Parse AI response
    let aiAnalysis;
    try {
      const cleanedContent = aiContent
        .replace(/```json\n?/g, '')
        .replace(/\n?```/g, '')
        .trim();
      aiAnalysis = JSON.parse(cleanedContent);
      console.log('[Analysis] ✅ AI response parsed successfully');
    } catch (parseError) {
      console.error('[Analysis] ⚠️ Failed to parse AI response:', parseError);
      aiAnalysis = {
        executiveSummary: 'Analysis completed but response parsing failed.',
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
        _parseError: String(parseError),
        _usedFallback: usedFallback
      };
    }

    // Mark if fallback was used
    if (usedFallback) {
      aiAnalysis._usedFallback = true;
      aiAnalysis._fallbackNote = 'Analysis used simplified model due to primary model failure';
    }

    // Update recording with analysis
    await updateRecordingStatus(supabase, recordingId, {
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

    // Distribute to candidate/job profiles
    if (recording.candidate_id) {
      try {
        await supabase.from('candidate_interview_recordings').upsert({
          candidate_id: recording.candidate_id,
          recording_id: recordingId,
          meeting_id: recording.meeting_id,
          job_title: jobTitle || 'Interview',
          company_name: companyName || null,
          interview_date: meetingData.scheduled_start || recording.created_at,
          overall_score: aiAnalysis.candidateEvaluation?.overallFit || 'pending',
          recommendation: aiAnalysis.decisionGuidance?.recommendation || 'pending'
        }, { onConflict: 'recording_id' });
      } catch (err) {
        console.warn('[Analysis] Could not link to candidate:', err);
      }
    }

    if (recording.job_id) {
      try {
        await supabase.from('job_interview_recordings').upsert({
          job_id: recording.job_id,
          recording_id: recordingId,
          meeting_id: recording.meeting_id,
          candidate_name: candidateName || 'Candidate',
          candidate_id: recording.candidate_id || null,
          interview_stage: meetingData.meeting_type || 'interview',
          overall_score: aiAnalysis.candidateEvaluation?.overallFit || 'pending',
          recommendation: aiAnalysis.decisionGuidance?.recommendation || 'pending'
        }, { onConflict: 'recording_id' });
      } catch (err) {
        console.warn('[Analysis] Could not link to job:', err);
      }
    }

    // Create tasks from action items
    if (aiAnalysis.actionItems?.length > 0) {
      try {
        const tasks = aiAnalysis.actionItems.slice(0, 5).map((item: any) => ({
          title: String(item.task || 'Follow up task'),
          description: `From meeting: ${meetingData.title || 'Interview'}`,
          priority: String(item.priority || 'medium'),
          status: 'todo',
          user_id: recording.host_id,
          category: String(item.category || 'follow_up')
        }));

        await supabase.from('unified_tasks').insert(tasks);
        console.log(`[Analysis] ✅ Created ${tasks.length} tasks`);
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
          used_fallback: usedFallback,
          is_reanalysis: isReanalysis
        }
      });
    } catch (err) {
      console.warn('[Analysis] Could not log to audit:', err);
    }

    const totalTime = Date.now() - startTime;
    console.log(`[Analysis] ✅ Completed in ${totalTime}ms:`, recordingId);

    // Trigger embedding generation for ML/RAG integration
    try {
      const embedResponse = await fetch(`${supabaseUrl}/functions/v1/embed-meeting-intelligence`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recordingId })
      });
      
      if (embedResponse.ok) {
        console.log('[Analysis] 🔗 Embedding generation triggered successfully');
      } else {
        console.warn('[Analysis] ⚠️ Embedding generation returned non-OK:', embedResponse.status);
      }
    } catch (embErr) {
      console.warn('[Analysis] ⚠️ Failed to trigger embedding generation:', embErr);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis: aiAnalysis,
        stats: {
          duration_ms: totalTime,
          transcript_chars: transcript.length,
          retry_count: currentRetryCount,
          used_fallback: usedFallback,
          embeddings_triggered: true
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('[Analysis] ❌ Error:', errorMessage);

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
