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
    }
};
