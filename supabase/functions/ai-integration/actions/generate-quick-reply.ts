import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkUserRateLimit, createRateLimitResponse } from '../../_shared/rate-limiter.ts';
import { logAIUsage } from '../../_shared/ai-logger.ts';
import { fetchAI, handleAIError, createTimeoutResponse, AITimeoutError } from '../../_shared/ai-fetch.ts';
import { CommonErrors } from '../../_shared/error-responses.ts';

interface ActionContext {
    supabase: any;
    payload: any;
    userId: string | null;
}

export async function handleGenerateQuickReply({ supabase, payload, userId }: ActionContext) {
    const startTime = Date.now();

    if (!userId) {
        throw new Error('Unauthorized');
    }

    // Rate limiting: 30 requests per hour
    const rateLimit = await checkUserRateLimit(userId, 'generate-quick-reply', 30);
    if (!rateLimit.allowed) {
        await logAIUsage({
            userId,
            functionName: 'generate-quick-reply',
            rateLimitHit: true,
            success: false,
            errorMessage: 'Rate limit exceeded'
        });
        // This action handler pattern doesn't easily return Response objects for generic actions
        // But for now, we'll throw an error and let the router handle 500s or we adapt.
        // Ideally we'd return a specific structure. 
        // For this context, throwing error is safest fallback, though rate limit specific 
        // handling in router would be better.
        throw new Error(`Rate limit exceeded. Retry after ${rateLimit.retryAfter}s`);
    }

    const { conversationId, recentMessages } = payload;

    const messageHistory = recentMessages.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
    }));

    try {
        const response = await fetchAI({
            model: 'google/gemini-2.5-flash',
            messages: [
                {
                    role: 'system',
                    content: `You are an AI assistant helping draft professional, concise messages in a job application context. 
Generate a helpful, polite reply based on the conversation history. 
Keep responses under 150 words, professional, and friendly. 
Focus on moving the conversation forward constructively.`
                },
                ...messageHistory,
                {
                    role: 'user',
                    content: 'Generate a professional reply to continue this conversation:'
                }
            ],
            temperature: 0.7,
            max_tokens: 200,
        }, { timeoutMs: 20000 });

        if (!response.ok) {
            throw new Error(`AI API error: ${response.status}`);
        }

        const data = await response.json();
        const suggestion = data.choices[0]?.message?.content || '';

        await logAIUsage({
            userId,
            functionName: 'generate-quick-reply',
            responseTimeMs: Date.now() - startTime,
            success: true
        });

        return { suggestion };

    } catch (error) {
        await logAIUsage({
            userId,
            functionName: 'generate-quick-reply',
            responseTimeMs: Date.now() - startTime,
            success: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
    }
}
