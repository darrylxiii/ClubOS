import { createAuthenticatedHandler } from '../_shared/handler.ts';
import { checkUserRateLimit, createRateLimitResponse } from '../_shared/rate-limiter.ts';
import { logAIUsage, extractClientInfo } from '../_shared/ai-logger.ts';
import { fetchAI, handleAIError, createTimeoutResponse, AITimeoutError } from '../_shared/ai-fetch.ts';

Deno.serve(createAuthenticatedHandler(async (req, ctx) => {
  const startTime = Date.now();
  const clientInfo = extractClientInfo(req);
  const userId = ctx.user.id;

  // Rate limiting: 30 requests per hour
  const rateLimit = await checkUserRateLimit(userId, 'generate-quick-reply', 30);
  if (!rateLimit.allowed) {
    console.log('[generate-quick-reply] Rate limit exceeded for user:', userId);
    await logAIUsage({
      userId,
      functionName: 'generate-quick-reply',
      ...clientInfo,
      rateLimitHit: true,
      success: false,
      errorMessage: 'Rate limit exceeded'
    });
    return createRateLimitResponse(rateLimit.retryAfter!, ctx.corsHeaders);
  }

  const { conversationId, recentMessages } = await req.json();

  // Build context from recent messages
  const messageHistory = recentMessages.map((msg: any) => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.content
  }));

  console.log('[generate-quick-reply] Calling Google Gemini');

  try {
    // Use timeout-protected AI fetch (20s timeout for quick replies)
    const response = await fetchAI({
      model: 'gemini-2.5-flash-lite',
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

    // Handle AI errors consistently
    const errorResponse = handleAIError(response, ctx.corsHeaders);
    if (errorResponse) {
      await logAIUsage({
        userId,
        functionName: 'generate-quick-reply',
        ...clientInfo,
        responseTimeMs: Date.now() - startTime,
        success: false,
        errorMessage: `AI error: ${response.status}`
      });
      return errorResponse;
    }

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const suggestion = data.choices[0]?.message?.content || '';

    await logAIUsage({
      userId,
      functionName: 'generate-quick-reply',
      ...clientInfo,
      responseTimeMs: Date.now() - startTime,
      success: true
    });

    console.log('[generate-quick-reply] Suggestion generated successfully');

    return new Response(
      JSON.stringify({ suggestion }),
      { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[generate-quick-reply] Error:', error);

    // Handle timeout errors specifically
    if (error instanceof AITimeoutError) {
      await logAIUsage({
        userId,
        functionName: 'generate-quick-reply',
        ...clientInfo,
        responseTimeMs: Date.now() - startTime,
        success: false,
        errorMessage: 'Request timed out'
      });
      return createTimeoutResponse(ctx.corsHeaders);
    }

    await logAIUsage({
      userId,
      functionName: 'generate-quick-reply',
      ...clientInfo,
      responseTimeMs: Date.now() - startTime,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });

    throw error;
  }
}));
