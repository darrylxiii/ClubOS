import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { compileTranscript } from "./compile-transcript.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const TRANSCRIPT_CHUNK_SIZE = 15000;
const AI_TIMEOUT_MS = 60000;

// Circuit Breaker (Global map in Deno runtime)
const circuitBreakers = new Map<string, { failures: number, lastFailure: number, isOpen: boolean }>();
const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_RESET_TIMEOUT_MS = 30000;

function checkCircuit(name: string): boolean {
    if (!circuitBreakers.has(name)) {
        circuitBreakers.set(name, { failures: 0, lastFailure: 0, isOpen: false });
    }
    const cb = circuitBreakers.get(name)!;
    if (cb.isOpen && Date.now() - cb.lastFailure > CIRCUIT_RESET_TIMEOUT_MS) {
        cb.isOpen = false;
        cb.failures = 0;
    }
    return !cb.isOpen;
}

function recordSuccess(name: string) {
    const cb = circuitBreakers.get(name);
    if (cb) {
        cb.failures = 0;
        cb.isOpen = false;
    }
}

function recordFailure(name: string) {
    const cb = circuitBreakers.get(name);
    if (cb) {
        cb.failures++;
        cb.lastFailure = Date.now();
        if (cb.failures >= CIRCUIT_FAILURE_THRESHOLD) cb.isOpen = true;
    }
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = MAX_RETRIES): Promise<T> {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (e) {
            lastError = e;
            if (i < maxRetries - 1) await new Promise(r => setTimeout(r, RETRY_DELAY_MS * Math.pow(2, i)));
        }
    }
    throw lastError;
}

async function updateRecordingStatus(supabase: any, recordingId: string, updates: any) {
    await supabase.from('meeting_recordings_extended')
        .update({ ...updates, last_analysis_attempt: new Date().toISOString() })
        .eq('id', recordingId);
}

async function callAI(apiKey: string, prompt: string, model: string, maxTokens: number = 2000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    try {
        const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: 'You are an expert interview analyst. Return only valid JSON.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: maxTokens
            }),
            signal: controller.signal
        });

        if (!res.ok) throw new Error(`AI Error ${res.status}: ${await res.text()}`);
        return await res.json();
    } finally {
        clearTimeout(timeoutId);
    }
}

export const analyzeRecordingHandler = async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    let recordingId: string | null = null;
    const startTime = Date.now();

    try {
        const body = await req.json();
        recordingId = body.recordingId;
        const isReanalysis = body.reanalyze === true;
        
        if (!recordingId) throw new Error('recordingId is required');

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

        // 1. Compile Transcript (Direct Call)
        console.log('[Analysis] Compiling transcript...');
        await compileTranscript({ recordingId }, supabase);

        // 2. Fetch Recording
        const { data: recording, error: recError } = await supabase
            .from('meeting_recordings_extended')
            .select(`*, meetings(*)`)
            .eq('id', recordingId)
            .single();
        
        if (recError || !recording) throw new Error('Recording not found');

        const currentRetryCount = isReanalysis ? 0 : ((recording.analysis_retry_count || 0) + 1);
        await updateRecordingStatus(supabase, recordingId, {
            analysis_status: 'processing',
            processing_status: 'processing',
            analysis_retry_count: currentRetryCount
        });

        const transcript = recording.transcript || '';
        const durationMinutes = Math.round((recording.duration_seconds || 1800) / 60);

        // 3. AI Analysis
        const analysisPrompt = `
            Analyze this interview meeting.
            Duration: ${durationMinutes} mins.
            Transcript:
            ${transcript.substring(0, 50000)} ... (truncated if long)
            
            Return JSON:
            {
                "executiveSummary": "...",
                "candidateEvaluation": { "overallFit": "poor|fair|good|excellent", ... },
                "actionItems": [],
                "keyMoments": []
            }
        `;

        console.log('[Analysis] Calling AI...');
        let aiResponse;
        try {
            if (checkCircuit('primary-ai')) {
                const res = await callAI(lovableApiKey, analysisPrompt, 'google/gemini-2.5-flash', 4000);
                aiResponse = res;
                recordSuccess('primary-ai');
            } else {
                throw new Error('Circuit Open');
            }
        } catch (e) {
            recordFailure('primary-ai');
            console.log('[Analysis] Primary failed, using fallback');
            aiResponse = await callAI(lovableApiKey, analysisPrompt, 'google/gemini-2.5-flash-lite', 2000);
        }

        const aiContent = aiResponse.choices?.[0]?.message?.content || '{}';
        const cleanedContent = aiContent.replace(/```json\n?/g, '').replace(/\n?```/g, '').trim();
        const aiAnalysis = JSON.parse(cleanedContent);

        // 4. Save Results
        await updateRecordingStatus(supabase, recordingId, {
            ai_summary: aiAnalysis,
            ai_analysis: aiAnalysis,
            executive_summary: aiAnalysis.executiveSummary,
            action_items: aiAnalysis.actionItems || [],
            key_moments: aiAnalysis.keyMoments || [],
            analysis_status: 'completed',
            processing_status: 'completed',
            analyzed_at: new Date().toISOString()
        });
        
        return new Response(JSON.stringify({ success: true, analysis: aiAnalysis }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (error: any) {
        console.error('[Analysis] Error:', error);
        if (recordingId) {
            const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
            await updateRecordingStatus(supabase, recordingId as string, {
                analysis_status: 'failed',
                processing_status: 'failed',
                processing_error: error.message
            });
        }
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
};
