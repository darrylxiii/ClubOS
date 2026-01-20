import { supabase } from "@/integrations/supabase/client";
import type {
    AssistEmailParams,
    AssistEmailResponse,
    GenerateTextParams,
    GenerateTextResponse,
    SentimentResult,
    ClassificationResult,
    SearchParams,
    SearchResult,
    EmbeddingParams,
    EmbeddingResponse,
    BatchEmbeddingParams,
    BatchEmbeddingResponse,
    TranscriptParams,
    TranscriptSegment,
    AnalyzeRecordingParams,
    RecordingAnalysisOptions,
    HighlightClip,
    SpeakingMetrics,
    RealtimeAnalysisParams,
    RealtimeAnalysisResponse,
    AnalyzeInterviewParams,
    InterviewAnalysisResult,
    VoiceToTextParams,
    VoiceToTextResponse,
    PrepParams,
    InterviewPrepBrief,
    CoachParams,
    InterviewCoachMaterial,
    SentinelParams,
    SentinelResponse,
    VoiceSessionParams,
    VoiceSessionResponse,
    QuinParams,
    QuinResponse,
    GenerateCrmReplyParams,
    GenerateCrmReplyResponse,
    GenerateWhatsappReplyParams,
    GenerateWhatsappReplyResponse,
    GenerateQuickReplyParams,
    GenerateQuickReplyResponse,
    GenerateFollowUpParams,
    GenerateFollowUpResponse,
    ExecutiveBriefingParams,
    ExecutiveBriefing,
    CompanyInsightsParams,
    CompanyInsights,
    CareerInsightsParams,
    CareerInsights,
    KPIInsightsParams,
    KPIInsights,
    ActivityInsights,
    RoleAnalytics,
    GenerateDossierParams,
    CandidateDossier,
    MeetingDossierParams,
    MeetingDossier,
    InterviewReportParams,
    InterviewReport,
    OfferRecommendationParams,
    OfferRecommendation,
    CampaignAutopilotResponse,
    ABTestVariantsParams,
    ABTestVariantsResponse,
    AgentTaskParams,
    AgentTaskResponse,
    ExtractTasksParams,
    ExtractTasksResponse,
    DailyChallengesResponse,
    GeneratePostParams,
    GeneratePostResponse,
    TranslateResponse,
    JobData,
} from "@/types/ai";

// ============= Response Types for Supabase Function Invocations =============

interface AnalyzeEmailSentimentPayload {
    email: {
        id: string;
        subject?: string;
        body?: string;
        from?: string;
        to?: string;
    };
    save_match?: boolean;
}

interface AnalyzeEmailSentimentResponse {
    sentiment: SentimentResult;
    matched_entity?: {
        type: 'candidate' | 'company' | 'prospect';
        id: string;
        name: string;
    };
}

interface AnalyzeEmailReplyPayload {
    email_id: string;
    thread_id?: string;
    content: string;
    sender: string;
}

interface AnalyzeEmailReplyResponse {
    analysis: {
        intent: string;
        classification?: string; // Add this to satisfy usage if we can't fully refactor
        sentiment: SentimentResult;
        suggested_actions: string[];
        priority: 'low' | 'medium' | 'high';
    };
}

interface OutreachStrategyPayload {
    query?: string;
    context?: Record<string, unknown>;
    industry?: string;
    target_persona?: string;
    company_size?: string;
    goal?: string;
}

interface OutreachStrategyResponse {
    strategy: {
        channels: string[];
        messaging_approach: string;
        timing_recommendations: string[];
        personalization_tips: string[];
    };
    templates: Array<{
        channel: string;
        subject?: string;
        body: string;
    }>;
}

interface WhatsAppConversationAnalysis {
    summary: string;
    sentiment_trend: 'improving' | 'stable' | 'declining';
    key_topics: string[];
    action_items: string[];
    relationship_health: number;
}

// ============= AI Service Implementation =============

export const aiService = {
    assistEmail: async (params: AssistEmailParams): Promise<AssistEmailResponse> => {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action: 'assist-email', payload: params }
        });
        if (error) throw error;
        if (data && data.error) throw new Error(data.error);
        return data as AssistEmailResponse;
    },

    generateText: async (params: GenerateTextParams): Promise<GenerateTextResponse> => {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action: 'generate-text', payload: params }
        });
        if (error) throw error;
        if (data && data.error) throw new Error(data.error);
        return data as GenerateTextResponse;
    },

    analyzeSentiment: async (text: string): Promise<SentimentResult> => {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action: 'analyze-sentiment', payload: { text } }
        });
        if (error) throw error;
        if (data && data.error) throw new Error(data.error);
        return data as SentimentResult;
    },

    classifyIntent: async (query: string): Promise<ClassificationResult> => {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action: 'classify-intent', payload: { query } }
        });
        if (error) throw error;
        if (data && data.error) throw new Error(data.error);
        return data as ClassificationResult;
    },

    generateEmbedding: async (params: EmbeddingParams): Promise<EmbeddingResponse> => {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action: 'generate-embedding', payload: params }
        });
        if (error) throw error;
        if (data && data.error) throw new Error(data.error);
        return data as EmbeddingResponse;
    },

    batchGenerateEmbedding: async (params: BatchEmbeddingParams): Promise<BatchEmbeddingResponse> => {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action: 'batch-generate-embedding', payload: params }
        });
        if (error) throw error;
        if (data && data.error) throw new Error(data.error);
        return data as BatchEmbeddingResponse;
    },

    semanticSearch: async (params: SearchParams): Promise<{ results: SearchResult[]; count: number }> => {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action: 'semantic-search', payload: params }
        });
        if (error) throw error;
        if (data && data.error) throw new Error(data.error);
        return data as { results: SearchResult[]; count: number };
    },

    analyzeInterview: async (params: AnalyzeInterviewParams): Promise<InterviewAnalysisResult> => {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action: 'analyze-interview', payload: params }
        });
        if (error) throw error;
        if (data && data.error) throw new Error(data.error);
        return (data.analysis || data) as InterviewAnalysisResult;
    },

    analyzeInterviewRealtime: async (params: RealtimeAnalysisParams): Promise<RealtimeAnalysisResponse> => {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action: 'analyze-interview-realtime', payload: params }
        });
        if (error) throw error;
        if (data && data.error) throw new Error(data.error);
        return data as RealtimeAnalysisResponse;
    },

    voiceToText: async (params: VoiceToTextParams): Promise<VoiceToTextResponse> => {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action: 'voice-to-text', payload: params }
        });
        if (error) throw error;
        if (data && data.error) throw new Error(data.error);
        return data as VoiceToTextResponse;
    },

    generateInterviewPrep: async (params: PrepParams): Promise<{ brief: InterviewPrepBrief }> => {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action: 'generate-interview-prep', payload: params }
        });
        if (error) throw error;
        if (data && data.error) throw new Error(data.error);
        return data as { brief: InterviewPrepBrief };
    },

    generateInterviewCoach: async (params: CoachParams): Promise<{ prepMaterial: InterviewCoachMaterial }> => {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action: 'generate-interview-coach', payload: params }
        });
        if (error) throw error;
        if (data && data.error) throw new Error(data.error);
        return data as { prepMaterial: InterviewCoachMaterial };
    },

    // Helper to invoke the unified function with proper typing
    async invokeAI<T>(action: string, payload: unknown): Promise<T> {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action, payload }
        });
        if (error) throw error;
        return data as T;
    },

    async compileTranscript(params: TranscriptParams): Promise<{
        transcript: string;
        segments: TranscriptSegment[];
        duration: number
    }> {
        return this.invokeAI('compile-transcript', params);
    },

    async analyzeTranscript(meetingId: string): Promise<{
        summary: string;
        key_points: string[];
        action_items: string[]
    }> {
        return this.invokeAI('analyze-transcript', { meeting_id: meetingId });
    },

    async analyzeRecording(params: AnalyzeRecordingParams): Promise<{
        transcript?: string;
        highlights?: HighlightClip[];
        sentiment?: SentimentResult;
        topics?: string[];
        action_items?: string[];
    }> {
        return this.invokeAI('analyze-recording', params as unknown as Record<string, unknown>);
    },

    async generateHighlightClips(recordingId: string): Promise<{ clips: HighlightClip[] }> {
        return this.invokeAI('highlight-clips', { recordingId });
    },

    async calculateSpeakingMetrics(recordingId: string): Promise<SpeakingMetrics> {
        return this.invokeAI('speaking-metrics', { recordingId });
    },

    async downloadYoutubeAudio(url: string): Promise<{ audio_url: string; title: string }> {
        return this.invokeAI('download-youtube', { youtubeUrl: url });
    },

    async generateCrmReply(params: GenerateCrmReplyParams): Promise<GenerateCrmReplyResponse> {
        return this.invokeAI('generate-crm-reply', params as unknown as Record<string, unknown>);
    },

    async generateWhatsappReply(params: GenerateWhatsappReplyParams): Promise<GenerateWhatsappReplyResponse> {
        return this.invokeAI('generate-whatsapp-reply', params as unknown as Record<string, unknown>);
    },

    async generatePostSuggestions(params: GeneratePostParams): Promise<GeneratePostResponse> {
        return this.invokeAI('generate-post-suggestions', params as unknown as Record<string, unknown>);
    },

    async generatePost(params: GeneratePostParams): Promise<GeneratePostResponse> {
        return this.invokeAI('generate-social-post', params as unknown as Record<string, unknown>);
    },

    async generateQuickReply(params: GenerateQuickReplyParams): Promise<GenerateQuickReplyResponse> {
        return this.invokeAI('generate-quick-reply', params as unknown as Record<string, unknown>);
    },

    async generatePersonalizedFollowUp(params: GenerateFollowUpParams): Promise<GenerateFollowUpResponse> {
        return this.invokeAI('generate-personalized-follow-up', params as unknown as Record<string, unknown>);
    },

    async generatePostSummary(params: { post_id: string; include_comments?: boolean }): Promise<{
        summary: string;
        key_points: string[];
        sentiment: SentimentResult;
        engagement_analysis: string;
    }> {
        return this.invokeAI('generate-post-summary', params);
    },

    async extractCommunicationTasks(params: ExtractTasksParams): Promise<ExtractTasksResponse> {
        return this.invokeAI('generate-communication-tasks', params as unknown as Record<string, unknown>);
    },

    // Batch 2: Business Intelligence Reports
    async generateExecutiveBriefing(params: ExecutiveBriefingParams): Promise<ExecutiveBriefing> {
        return this.invokeAI('generate-executive-briefing', params);
    },

    async generateCompanyInsights(params: CompanyInsightsParams): Promise<CompanyInsights> {
        return this.invokeAI('generate-company-insights', params as unknown as Record<string, unknown>);
    },

    async generateCompanyReport(params: { company_id: string; period_days?: number }): Promise<{
        report: string;
        metrics: Record<string, number>;
        recommendations: string[];
    }> {
        return this.invokeAI('generate-company-intelligence-report', params);
    },

    async generateActivityInsights(params: { timeframe?: '24h' | '7d' | '30d' }): Promise<ActivityInsights> {
        return this.invokeAI('generate-activity-insights', params);
    },

    async generateOutreachInsights(params: Record<string, unknown> = {}): Promise<{
        insights: string[];
        metrics: Record<string, number>;
        recommendations: string[];
    }> {
        return this.invokeAI('generate-daily-outreach-insights', params);
    },

    async generateCareerInsights(params: CareerInsightsParams): Promise<CareerInsights> {
        return this.invokeAI('generate-career-insights', params as unknown as Record<string, unknown>);
    },

    async generateKPIInsights(params: KPIInsightsParams): Promise<KPIInsights> {
        return this.invokeAI('generate-kpi-insights', params as unknown as Record<string, unknown>);
    },

    async generatePartnerInsights(params: { companyId: string; insightType?: string }): Promise<{
        insights: string[];
        opportunities: string[];
        risks: string[];
    }> {
        return this.invokeAI('generate-partner-insights', params);
    },

    async generateRelationshipInsights(params: { entity_type: string; entity_id: string }): Promise<{
        health_score: number;
        sentiment_trend: string;
        key_interactions: string[];
        recommendations: string[];
    }> {
        return this.invokeAI('generate-relationship-insights', params);
    },

    async generateRoleAnalytics(params: { userId?: string } = {}): Promise<RoleAnalytics> {
        return this.invokeAI('generate-role-analytics', params);
    },

    async generateAnalyticsInsights(params: { userId?: string } = {}): Promise<{
        summary: string;
        trends: Array<{ metric: string; direction: 'up' | 'down' | 'stable'; change: number }>;
        recommendations: string[];
    }> {
        return this.invokeAI('generate-analytics-insights', params);
    },

    // Batch 3: Documents & Dossiers
    async generateCandidateDossier(params: GenerateDossierParams): Promise<CandidateDossier> {
        return this.invokeAI('generate-candidate-dossier', params as unknown as Record<string, unknown>);
    },

    async generateMeetingDossier(params: MeetingDossierParams): Promise<MeetingDossier> {
        return this.invokeAI('generate-meeting-dossier', params as unknown as Record<string, unknown>);
    },

    async generateInterviewReport(params: InterviewReportParams): Promise<InterviewReport> {
        return this.invokeAI('generate-interview-report', params);
    },

    async generateProjectProposal(params: { projectId: string; freelancerId: string }): Promise<{
        proposal: string;
        estimated_timeline: string;
        deliverables: string[];
        pricing: { amount: number; currency: string };
    }> {
        return this.invokeAI('generate-project-proposal', params);
    },

    async generateOfferRecommendation(params: OfferRecommendationParams): Promise<OfferRecommendation> {
        return this.invokeAI('generate-offer-recommendation', params);
    },

    async generateCertificate(params: { courseId: string; userId: string }): Promise<{
        certificate_url: string;
        certificate_id: string;
    }> {
        return this.invokeAI('generate-certificate', params);
    },

    async generateInterviewDescription(params: {
        job_title: string;
        company_name: string;
        interview_type: string;
    }): Promise<{ description: string }> {
        return this.invokeAI('generate-interview-description', params);
    },

    async generateDailyChallenges(): Promise<DailyChallengesResponse> {
        return this.invokeAI('generate-daily-challenges', {});
    },

    async generateCampaignAutopilot(
        goal: string,
        target_audience: string,
        industry?: string,
        sender_name?: string
    ): Promise<CampaignAutopilotResponse> {
        return this.invokeAI('generate-campaign-autopilot', {
            goal,
            target_audience,
            industry,
            sender_name,
        });
    },

    async assignAgentTask(params: AgentTaskParams): Promise<AgentTaskResponse> {
        return this.invokeAI('assign-agent-task', params as unknown as Record<string, unknown>);
    },

    // Batch 4: Utilities & ML
    async generateABTestVariants(params: ABTestVariantsParams): Promise<ABTestVariantsResponse> {
        return this.invokeAI('generate-ab-test-variants', params as unknown as Record<string, unknown>);
    },

    async generateQueryVariations(params: {
        query: string;
        context?: string;
        numVariations?: number;
    }): Promise<{ variations: string[] }> {
        return this.invokeAI('generate-query-variations', params);
    },

    async generateUserEmbeddings(): Promise<{ processed: number; errors: number }> {
        return this.invokeAI('generate-user-embeddings', {});
    },

    async generateMLFeatures(params: {
        candidate_id: string;
        job_id: string;
        application_id?: string;
        use_cache?: boolean;
    }): Promise<{ features: Record<string, number>; version: string }> {
        return this.invokeAI('generate-ml-features', params);
    },

    async generateAllTranslations(params: {
        namespace?: string;
        generateAll?: boolean;
        jobId?: string;
    }): Promise<TranslateResponse & { count: number }> {
        return this.invokeAI('generate-all-translations', params);
    },

    async generatePlaceholders(params: { messages: Array<{ key: string; context?: string }> }): Promise<{
        placeholders: Record<string, string>;
    }> {
        return this.invokeAI('generate-placeholders', params);
    },

    analyzeInterviewStream: async (params: SentinelParams): Promise<SentinelResponse> => {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action: 'analyze-interview-stream', payload: params }
        });
        if (error) throw error;
        return data as SentinelResponse;
    },

    interviewVoiceSession: async (params: VoiceSessionParams): Promise<VoiceSessionResponse> => {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action: 'interview-voice-session', payload: params }
        });
        if (error) throw error;
        if (data.error) throw new Error(data.error);
        return data as VoiceSessionResponse;
    },

    quinMeetingVoice: async (params: QuinParams): Promise<QuinResponse> => {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action: 'quin-meeting-voice', payload: params }
        });
        if (error) throw error;
        return data as QuinResponse;
    },

    // Batch 5: Stragglers
    analyzeEmailSentiment: async (payload: AnalyzeEmailSentimentPayload): Promise<AnalyzeEmailSentimentResponse> => {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action: 'analyze-email-sentiment', payload }
        });
        if (error) throw error;
        return data as AnalyzeEmailSentimentResponse;
    },

    analyzeEmailReply: async (payload: AnalyzeEmailReplyPayload): Promise<AnalyzeEmailReplyResponse> => {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action: 'analyze-email-reply', payload }
        });
        if (error) throw error;
        return data as AnalyzeEmailReplyResponse;
    },

    generateOutreachStrategy: async (payload: OutreachStrategyPayload): Promise<OutreachStrategyResponse> => {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action: 'generate-outreach-strategy', payload }
        });
        if (error) throw error;
        return data as OutreachStrategyResponse;
    },

    analyzeWhatsAppConversation: async (conversationId: string): Promise<WhatsAppConversationAnalysis> => {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action: 'analyze-whatsapp-conversation', payload: { conversationId } }
        });
        if (error) throw error;
        return data as WhatsAppConversationAnalysis;
    }
};

// Re-export types for consumers
export type {
    AssistEmailParams,
    GenerateTextParams,
    SentimentResult,
    ClassificationResult,
    SearchParams,
    SearchResult,
    EmbeddingParams,
    BatchEmbeddingParams,
    TranscriptParams,
    AnalyzeRecordingParams,
    RecordingAnalysisOptions,
    RealtimeAnalysisParams,
    AnalyzeInterviewParams,
    VoiceToTextParams,
    PrepParams,
    CoachParams,
    SentinelParams,
    VoiceSessionParams,
    QuinParams,
    JobData,
    InterviewAnalysisResult,
    InterviewPrepBrief,
    InterviewCoachMaterial,
    SentinelResponse,
    QuinResponse,
    HighlightClip,
    SpeakingMetrics,
};
