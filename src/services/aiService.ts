import { supabase } from "@/integrations/supabase/client";

interface AssistEmailParams {
    action: 'compose' | 'improve' | 'shorten' | 'expand' | 'professional' | 'friendly';
    currentText: string;
    subject?: string;
    recipientEmail?: string;
}

interface GenerateTextParams {
    operation: 'improve' | 'summarize' | 'expand' | 'translate' | 'generate' | 'simplify' | 'professional' | 'casual';
    text: string;
    context?: string;
    targetLanguage?: string;
    customPrompt?: string;
}

interface SentimentResult {
    sentiment: 'positive' | 'neutral' | 'negative';
    score: number;
    explanation: string;
}

interface ClassificationResult {
    intent_type: string; // Simplified for brevity in frontend types
    confidence: number;
    sub_intents: string[];
    [key: string]: any;
}

interface SearchParams {
    query: string;
    entity_type: 'candidate' | 'job' | 'knowledge' | 'interaction';
    limit?: number;
    threshold?: number;
}

interface EmbeddingParams {
    text: string;
    entity_type?: 'candidate' | 'job' | 'knowledge' | 'interaction';
    entity_id?: string;
}

interface BatchEmbeddingParams {
    entity_type: 'candidate' | 'job' | 'knowledge' | 'interaction';
    limit?: number;
    offset?: number;
}

interface TranscriptParams {
    meetingId: string;
    segments?: any[];
}

interface AnalyzeRecordingParams {
    recordingId: string;
    meetingId?: string;
    options?: any;
    reanalyze?: boolean;
}


interface RealtimeAnalysisParams {
    meetingId: string;
    transcript: string;
}

interface AnalyzeInterviewParams {
    transcript: string;
    jobData: {
        position: string;
        company: string;
        description: string;
        skills: string[];
        interviewType?: string;
    };
}

interface VoiceToTextParams {
    audio: string; // base64
    meetingId?: string;
    participantName?: string;
    timestamp?: string;
}

interface PrepParams {
    meetingId: string;
    candidateId: string;
    roleTitle: string;
    companyName: string;
}

interface CoachParams {
    candidateId: string;
    jobId: string;
    interviewerId?: string;
    interviewType?: string;
}

interface SentinelParams {
    transcript_chunk: string;
    candidate_id?: string;
    session_id?: string;
}

interface VoiceSessionParams {
    jobData?: any;
    agentId?: string;
}

interface QuinParams {
    command: string;
    meetingId?: string;
    context?: any;
}

interface ServiceResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    [key: string]: any; // Allow loose indexing for now
}

export const aiService = {
    assistEmail: async (params: AssistEmailParams): Promise<{ suggestion: string }> => {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action: 'assist-email', payload: params }
        });
        if (error) throw error;
        // The endpoint returns { suggestion: ... } or { error ... }
        if (data.error) throw new Error(data.error);
        return data;
    },

    generateText: async (params: GenerateTextParams): Promise<{ result: string }> => {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action: 'generate-text', payload: params }
        });
        if (error) throw error;
        if (data.error) throw new Error(data.error);
        return data;
    },

    analyzeSentiment: async (text: string): Promise<SentimentResult> => {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action: 'analyze-sentiment', payload: { text } }
        });
        if (error) throw error;
        if (data.error) throw new Error(data.error);
        return data;
    },

    classifyIntent: async (query: string): Promise<ClassificationResult> => {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action: 'classify-intent', payload: { query } }
        });
        if (error) throw error;
        if (data.error) throw new Error(data.error);
        return data;
    },

    generateEmbedding: async (params: EmbeddingParams): Promise<{ embedding: number[]; dimensions: number }> => {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action: 'generate-embedding', payload: params }
        });
        if (error) throw error;
        if (data.error) throw new Error(data.error);
        return data;
    },

    batchGenerateEmbedding: async (params: BatchEmbeddingParams): Promise<{ processed: number; errors: number }> => {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action: 'batch-generate-embedding', payload: params }
        });
        if (error) throw error;
        if (data.error) throw new Error(data.error);
        return data;
    },

    semanticSearch: async (params: SearchParams): Promise<{ results: any[]; count: number }> => {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action: 'semantic-search', payload: params }
        });
        if (error) throw error;
        if (data.error) throw new Error(data.error);
        return data;
    },

    analyzeInterview: async (params: AnalyzeInterviewParams): Promise<any> => {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action: 'analyze-interview', payload: params }
        });
        if (error) throw error;
        if (data.error) throw new Error(data.error);
        return data.analysis || data; // Handle both wrapper styles if necessary, simplified here
    },

    analyzeInterviewRealtime: async (params: RealtimeAnalysisParams): Promise<{ success: boolean; scores: any }> => {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action: 'analyze-interview-realtime', payload: params }
        });
        if (error) throw error;
        if (data.error) throw new Error(data.error);
        return data;
    },

    voiceToText: async (params: VoiceToTextParams): Promise<{ text: string }> => {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action: 'voice-to-text', payload: params }
        });
        if (error) throw error;
        if (data.error) throw new Error(data.error);
        return data;
    },

    generateInterviewPrep: async (params: PrepParams): Promise<{ brief: any }> => {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action: 'generate-interview-prep', payload: params }
        });
        if (error) throw error;
        if (data.error) throw new Error(data.error);
        return data;
    },

    generateInterviewCoach: async (params: CoachParams): Promise<{ prepMaterial: any }> => {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action: 'generate-interview-coach', payload: params }
        });
        if (error) throw error;
        if (data.error) throw new Error(data.error);
        return data;
    },

    // Helper to invoke the unified function
    async invokeAI(action: string, payload: any) {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action, payload }
        });
        if (error) throw error;
        return data;
    },

    async compileTranscript(params: TranscriptParams) {
        return this.invokeAI('compile-transcript', params);
    },

    async analyzeTranscript(meetingId: string) {
        return this.invokeAI('analyze-transcript', { meeting_id: meetingId });
    },

    async analyzeRecording(params: AnalyzeRecordingParams) {
        return this.invokeAI('analyze-recording', params);
    },

    async generateHighlightClips(recordingId: string) {
        return this.invokeAI('highlight-clips', { recordingId });
    },

    async calculateSpeakingMetrics(recordingId: string) {
        return this.invokeAI('speaking-metrics', { recordingId });
    },

    async downloadYoutubeAudio(url: string) {
        return this.invokeAI('download-youtube', { youtubeUrl: url });
    },

    async generateCrmReply(params: any) {
        return this.invokeAI('generate-crm-reply', params);
    },

    async generateWhatsappReply(params: any) {
        return this.invokeAI('generate-whatsapp-reply', params);
    },

    async generatePostSuggestions(params: any) {
        return this.invokeAI('generate-post-suggestions', params);
    },

    async generateQuickReply(params: any) {
        return this.invokeAI('generate-quick-reply', params);
    },

    async generatePersonalizedFollowUp(params: any) {
        return this.invokeAI('generate-personalized-follow-up', params);
    },

    async generatePostSummary(params: any) {
        return this.invokeAI('generate-post-summary', params);
    },

    async extractCommunicationTasks(params: {
        message_content: string;
        message_id: string;
        source: string;
        sender_id?: string;
    }) {
        return this.invokeAI('generate-communication-tasks', params);
    },

    // Batch 2: Business Intelligence Reports
    async generateExecutiveBriefing(params: { candidateId: string; jobId: string }) {
        return this.invokeAI('generate-executive-briefing', params);
    },

    async generateCompanyInsights(params: { companyId: string }) {
        return this.invokeAI('generate-company-insights', params);
    },

    async generateCompanyReport(params: { company_id: string; period_days?: number }) {
        return this.invokeAI('generate-company-intelligence-report', params);
    },

    async generateActivityInsights(params: { timeframe?: '24h' | '7d' | '30d' }) {
        return this.invokeAI('generate-activity-insights', params);
    },

    async generateOutreachInsights(params: any = {}) {
        return this.invokeAI('generate-daily-outreach-insights', params);
    },

    async generateCareerInsights(params: { userId: string; includeSkillGap?: boolean }) {
        return this.invokeAI('generate-career-insights', params);
    },

    async generateKPIInsights(params: { kpis: any[]; domainHealth: number }) {
        return this.invokeAI('generate-kpi-insights', params);
    },

    async generatePartnerInsights(params: { companyId: string; insightType?: string }) {
        return this.invokeAI('generate-partner-insights', params);
    },

    async generateRelationshipInsights(params: { entity_type: string; entity_id: string }) {
        return this.invokeAI('generate-relationship-insights', params);
    },

    async generateRoleAnalytics(params: { userId?: string } = {}) {
        return this.invokeAI('generate-role-analytics', params);
    },

    async generateAnalyticsInsights(params: { userId?: string } = {}) {
        return this.invokeAI('generate-analytics-insights', params);
    },

    // Batch 3: Documents & Dossiers
    async generateCandidateDossier(params: { candidateId: string; jobId: string }) {
        return this.invokeAI('generate-candidate-dossier', params);
    },

    async generateMeetingDossier(params: { recordingId: string; meetingId?: string; candidateId?: string; options?: any }) {
        return this.invokeAI('generate-meeting-dossier', params);
    },

    async generateInterviewReport(params: { meetingId: string; candidateId: string; roleTitle?: string; companyName?: string }) {
        return this.invokeAI('generate-interview-report', params);
    },

    async generateProjectProposal(params: { projectId: string; freelancerId: string }) {
        return this.invokeAI('generate-project-proposal', params);
    },

    async generateOfferRecommendation(params: { candidate_id: string; job_id: string }) {
        return this.invokeAI('generate-offer-recommendation', params);
    },

    async generateCertificate(params: { courseId: string; userId: string }) {
        return this.invokeAI('generate-certificate', params);
    },

    async generateInterviewDescription(params: any) {
        return this.invokeAI('generate-interview-description', params);
    },

    async generateDailyChallenges() {
        return this.invokeAI('generate-daily-challenges', {});
    },

    async generateCampaignAutopilot(goal: string, target_audience: string, industry?: string, sender_name?: string) {
        return this.invokeAI('generate-campaign-autopilot', {
            goal,
            target_audience,
            industry,
            sender_name,
        });
    },

    async assignAgentTask(params: {
        description: string;
        priority: number;
        required_skills?: string[];
        task_type?: string;
        metadata?: any;
    }) {
        return this.invokeAI('assign-agent-task', params);
    },

    // Batch 4: Utilities & ML
    async generateABTestVariants(params: {
        campaign_id: string;
        variant_type: 'subject' | 'body' | 'cta';
        original_content: string;
        industry?: string;
        target_audience?: string;
    }) {
        return this.invokeAI('generate-ab-test-variants', params);
    },

    async generateQueryVariations(params: {
        query: string;
        context?: string;
        numVariations?: number;
    }) {
        return this.invokeAI('generate-query-variations', params);
    },

    async generateUserEmbeddings() {
        // No params needed, runs on active users
        return this.invokeAI('generate-user-embeddings', {});
    },

    async generateMLFeatures(params: {
        candidate_id: string;
        job_id: string;
        application_id?: string;
        use_cache?: boolean;
    }) {
        return this.invokeAI('generate-ml-features', params);
    },

    async generateAllTranslations(params: {
        namespace?: string;
        generateAll?: boolean;
        jobId?: string;
    }) {
        return this.invokeAI('generate-all-translations', params);
    },

    async generatePlaceholders(params: { messages: any[] }) {
        return this.invokeAI('generate-placeholders', params);
    },

    analyzeInterviewStream: async (params: SentinelParams): Promise<any> => {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action: 'analyze-interview-stream', payload: params }
        });
        if (error) throw error;
        return data;
    },

    interviewVoiceSession: async (params: VoiceSessionParams): Promise<{ signedUrl: string }> => {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action: 'interview-voice-session', payload: params }
        });
        if (error) throw error;
        if (data.error) throw new Error(data.error);
        return data;
    },

    quinMeetingVoice: async (params: QuinParams): Promise<any> => {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action: 'quin-meeting-voice', payload: params }
        });
        if (error) throw error;
        return data;
    },

    // Batch 5: Stragglers
    analyzeEmailSentiment: async (payload: { email: any; save_match?: boolean }) => {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action: 'analyze-email-sentiment', payload }
        });
        if (error) throw error;
        return data;
    },

    analyzeEmailReply: async (payload: any) => {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action: 'analyze-email-reply', payload }
        });
        if (error) throw error;
        return data; // Returns full wrapper object per legacy expectations
    },

    generateOutreachStrategy: async (payload: {
        query?: string;
        context?: any;
        industry?: string;
        target_persona?: string;
        company_size?: string;
        goal?: string;
    }) => {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action: 'generate-outreach-strategy', payload }
        });
        if (error) throw error;
        return data;
    },

    analyzeWhatsAppConversation: async (conversationId: string) => {
        const { data, error } = await supabase.functions.invoke('ai-integration', {
            body: { action: 'analyze-whatsapp-conversation', payload: { conversationId } }
        });
        if (error) throw error;
        return data;
    }
};
