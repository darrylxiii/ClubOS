
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
// Batch 1: Communication & Social
import { handleGenerateCRMReply } from './actions/generate-crm-reply.ts';
import { handleGenerateWhatsAppReply } from './actions/generate-whatsapp-reply.ts';
import { handleGeneratePostSuggestions } from './actions/generate-post-suggestions.ts';
import { handleGenerateQuickReply } from './actions/generate-quick-reply.ts';
import { handleGeneratePersonalizedFollowUp } from './actions/generate-follow-up.ts';
import { handleGeneratePostSummary } from './actions/generate-post-summary.ts';
import { handleExtractCommunicationTasks } from './actions/extract-communication-tasks.ts';

// Batch 2: Business Intelligence
import { handleGenerateExecutiveBriefing } from './actions/generate-executive-briefing.ts';
import { handleGenerateCompanyInsights } from './actions/generate-company-insights.ts';
import { handleGenerateCompanyReport } from './actions/generate-company-report.ts';
import { handleGenerateActivityInsights } from './actions/generate-activity-insights.ts';
import { handleGenerateOutreachInsights } from './actions/generate-outreach-insights.ts';
import { handleGenerateCareerInsights } from './actions/generate-career-insights.ts';
import { handleGenerateKPIInsights } from './actions/generate-kpi-insights.ts';
import { handleGeneratePartnerInsights } from './actions/generate-partner-insights.ts';
import { handleGenerateRelationshipInsights } from './actions/generate-relationship-insights.ts';
import { handleGenerateRoleAnalytics } from './actions/generate-role-analytics.ts';
import { handleGenerateAnalyticsInsights } from './actions/generate-analytics-insights.ts';

// Batch 3: Documents & Dossiers
import { handleGenerateCandidateDossier } from './actions/generate-candidate-dossier.ts';
import { handleGenerateMeetingDossier } from './actions/generate-meeting-dossier.ts';
import { handleGenerateInterviewReport } from './actions/generate-interview-report.ts';
import { handleGenerateProjectProposal } from './actions/generate-project-proposal.ts';
import { handleGenerateOfferRecommendation } from './actions/generate-offer-recommendation.ts';
import { handleGenerateCertificate } from './actions/generate-certificate.ts';
import { handleGenerateInterviewDescription } from './actions/generate-interview-description.ts';
import { handleGenerateDailyChallenges } from './actions/generate-daily-challenges.ts';

// Batch 4: Utilities & ML
import { handleGenerateABTestVariants } from './actions/generate-ab-test-variants.ts';
import { handleGenerateQueryVariations } from './actions/generate-query-variations.ts';
import { handleGenerateUserEmbeddings } from './actions/generate-user-embeddings.ts';
import { handleGenerateMLFeatures } from './actions/generate-ml-features.ts';
import { handleGenerateAllTranslations } from './actions/generate-all-translations.ts';
import { handleGeneratePlaceholders } from './actions/generate-placeholders.ts';
import { handleGenerateCampaignAutopilot } from './actions/generate-campaign-autopilot.ts';
import { handleAssignAgentTask } from './actions/assign-agent-task.ts';

// Batch 5: Stragglers (Legacy Ports)
import { handleAnalyzeEmailSentiment } from './actions/analyze-email-sentiment.ts';
import { handleAnalyzeEmailReply } from './actions/analyze-email-reply.ts';
import { handleGenerateOutreachStrategy } from './actions/generate-outreach-strategy.ts';
import { handleAnalyzeWhatsAppConversation } from './actions/analyze-whatsapp-conversation.ts';
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
    'generate-crm-reply': handleGenerateCRMReply,
    'generate-whatsapp-reply': handleGenerateWhatsAppReply,
    'generate-post-suggestions': handleGeneratePostSuggestions,
    'generate-quick-reply': handleGenerateQuickReply,
    'generate-personalized-follow-up': handleGeneratePersonalizedFollowUp,
    'generate-post-summary': handleGeneratePostSummary,
    'extract-communication-tasks': handleExtractCommunicationTasks,

    // Batch 3: Documents & Dossiers
    'generate-candidate-dossier': handleGenerateCandidateDossier,
    'generate-meeting-dossier': handleGenerateMeetingDossier,
    'generate-interview-report': handleGenerateInterviewReport,
    'generate-project-proposal': handleGenerateProjectProposal,
    'generate-offer-recommendation': handleGenerateOfferRecommendation,
    'generate-certificate': handleGenerateCertificate,
    'generate-interview-description': handleGenerateInterviewDescription,
    'generate-daily-challenges': handleGenerateDailyChallenges,

    // Batch 4: Utilities & ML
    'generate-ab-test-variants': handleGenerateABTestVariants,
    'generate-query-variations': handleGenerateQueryVariations,
    'generate-user-embeddings': handleGenerateUserEmbeddings,
    'generate-ml-features': handleGenerateMLFeatures,
    'generate-all-translations': handleGenerateAllTranslations,
    'generate-placeholders': handleGeneratePlaceholders,
    'generate-campaign-autopilot': handleGenerateCampaignAutopilot,
    'assign-agent-task': handleAssignAgentTask,

    // Batch 5
    'analyze-email-sentiment': handleAnalyzeEmailSentiment,
    'analyze-email-reply': handleAnalyzeEmailReply,
    'generate-outreach-strategy': handleGenerateOutreachStrategy,
    'analyze-whatsapp-conversation': handleAnalyzeWhatsAppConversation,
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
        'interview-prep-chat',
        'generate-crm-reply',
        'generate-whatsapp-reply',
        'generate-post-suggestions',
        'generate-quick-reply',
        'generate-personalized-follow-up',
        'generate-post-summary',
        'extract-communication-tasks',

        // Batch 3
        'generate-candidate-dossier',
        'generate-meeting-dossier',
        'generate-interview-report',
        'generate-project-proposal',
        'generate-offer-recommendation',
        'generate-certificate',
        'generate-interview-description',
        'generate-daily-challenges',

        // Batch 4
        'generate-ab-test-variants',
        'generate-query-variations',
        'generate-user-embeddings',
        'generate-ml-features',
        'generate-all-translations',
        'generate-placeholders',
        'generate-campaign-autopilot',
        'assign-agent-task',

        // Batch 5
        'analyze-email-sentiment',
        'analyze-email-reply',
        'generate-outreach-strategy',
        'analyze-whatsapp-conversation',
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

        const response = await handler({
            supabase,
            payload: payload || {},
            userId,
            token: authHeader ? authHeader.replace('Bearer ', '') : null
        });

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
