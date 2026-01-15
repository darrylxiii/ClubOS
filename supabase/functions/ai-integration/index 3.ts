import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

import { handleAssistEmailWriting } from "./actions/assist-email.ts";
import { handleAiWriting } from "./actions/generate-text.ts";
import { handleAnalyzeSentiment } from "./actions/analyze-sentiment.ts";
import { handleClassifyIntent } from "./actions/classify-intent.ts";
import { handleGenerateEmbedding } from "./actions/generate-embedding.ts";
import { handleBatchGenerateEmbedding } from "./actions/batch-generate-embedding.ts";
import { handleSemanticSearch } from "./actions/search.ts";
import { handleAnalyzeInterview } from "./actions/analyze-interview.ts";
import { handleAnalyzeInterviewRealtime } from "./actions/analyze-interview-realtime.ts";
import { handleVoiceToText } from "./actions/voice-to-text.ts";
import { handleGenerateInterviewPrep } from "./actions/generate-interview-prep.ts";
import { handleGenerateInterviewCoach } from "./actions/generate-interview-coach.ts";
import { analyzeInterviewStreamHandler } from "./actions/analyze-interview-stream.ts";
import { interviewVoiceSessionHandler } from "./actions/interview-voice-session.ts";
import { quinMeetingVoiceHandler } from "./actions/quin-meeting-voice.ts";
import { interviewPrepChatHandler } from "./actions/interview-prep-chat.ts";
import { compileTranscriptHandler } from "./actions/compile-transcript.ts";
import { analyzeTranscriptHandler } from "./actions/analyze-transcript.ts";
import { analyzeRecordingHandler } from "./actions/analyze-recording.ts";
import { highlightClipsHandler } from "./actions/highlight-clips.ts";
import { speakingMetricsHandler } from "./actions/speaking-metrics.ts";
import { downloadYoutubeHandler } from "./actions/download-youtube.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ACTION_HANDLERS = {
    'assist-email': handleAssistEmailWriting,
    'generate-text': handleAiWriting,
    'analyze-sentiment': handleAnalyzeSentiment,
    'classify-intent': handleClassifyIntent,
    'generate-embedding': handleGenerateEmbedding,
    'batch-generate-embedding': handleBatchGenerateEmbedding,
    'semantic-search': handleSemanticSearch,
    'analyze-interview': handleAnalyzeInterview,
    'analyze-interview-realtime': handleAnalyzeInterviewRealtime,
    'voice-to-text': handleVoiceToText,
    'generate-interview-prep': handleGenerateInterviewPrep,
    'generate-interview-coach': handleGenerateInterviewCoach,
    'analyze-interview-stream': analyzeInterviewStreamHandler,
    'interview-voice-session': interviewVoiceSessionHandler,
    'quin-meeting-voice': quinMeetingVoiceHandler,
    'interview-prep-chat': interviewPrepChatHandler,
    'compile-transcript': compileTranscriptHandler,
    'analyze-transcript': analyzeTranscriptHandler,
    'analyze-recording': analyzeRecordingHandler,
    'highlight-clips': highlightClipsHandler,
    'speaking-metrics': speakingMetricsHandler,
    'download-youtube': downloadYoutubeHandler,
};

const RouterSchema = z.object({
    action: z.enum([
        'assist-email',
        'generate-text',
        'analyze-sentiment',
        'classify-intent',
        'generate-embedding',
        'batch-generate-embedding',
        'semantic-search',
        'analyze-interview',
        'analyze-interview-realtime',
        'voice-to-text',
        'generate-interview-prep',
        'generate-interview-coach',
        'analyze-interview-stream',
        'interview-voice-session',
        'quin-meeting-voice',
        'interview-prep-chat'
    ]),
    payload: z.record(z.unknown()).optional(),
});

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        const rawBody = await req.json();
        const result = RouterSchema.safeParse(rawBody);

        if (!result.success) {
            return new Response(
                JSON.stringify({ error: 'Invalid Request', details: result.error }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const { action, payload } = result.data;
        const handler = ACTION_HANDLERS[action];

        console.log(`[AI Service] Executing: ${action}`);

        const authHeader = req.headers.get('Authorization');
        let userId: string | null = null;
        if (authHeader) {
            const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
            userId = user?.id || null;
        }

        const response = await handler({ supabase, payload: payload || {}, userId });

        if (response instanceof Response) {
            return response;
        }

        return new Response(
            JSON.stringify(response),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error(`[AI Service] Error:`, error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
