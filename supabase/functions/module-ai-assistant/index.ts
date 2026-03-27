import { checkUserRateLimit, createRateLimitResponse } from '../_shared/rate-limiter.ts';
import { verifyRecaptcha, createRecaptchaErrorResponse } from '../_shared/recaptcha-verifier.ts';
import { logAIUsage, extractClientInfo } from '../_shared/ai-logger.ts';
import { createAuthenticatedHandler } from '../_shared/handler.ts';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

Deno.serve(createAuthenticatedHandler(async (req, ctx) => {
    const { user, corsHeaders } = ctx;

    const startTime = Date.now();
    const clientInfo = extractClientInfo(req);
    const userId = user.id;

    try {
    console.log('Module AI assistant: Authenticated user:', userId);

    // Rate limiting check: 20 requests per hour
    const rateLimit = await checkUserRateLimit(userId, 'module-ai-assistant', 20);
    if (!rateLimit.allowed) {
      await logAIUsage({
        userId,
        functionName: 'module-ai-assistant',
        ...clientInfo,
        rateLimitHit: true,
        success: false,
        errorMessage: 'Rate limit exceeded'
      });
      return createRateLimitResponse(rateLimit.retryAfter!, corsHeaders);
    }
    const body = await req.json() as {
      messages: Message[];
      moduleContext?: {
        title: string;
        description?: string;
        content?: string;
        courseTitle?: string;
        learningPathTitle?: string;
      };
      recaptchaToken?: string;
    };

    const { messages, moduleContext, recaptchaToken } = body;

    // reCAPTCHA verification
    if (recaptchaToken) {
      const recaptchaResult = await verifyRecaptcha(recaptchaToken, 'module_ai', 0.5);
      if (!recaptchaResult.success) {
        await logAIUsage({
          userId,
          functionName: 'module-ai-assistant',
          ...clientInfo,
          recaptchaScore: recaptchaResult.score,
          recaptchaPassed: false,
          success: false,
          errorMessage: 'reCAPTCHA verification failed'
        });
        return createRecaptchaErrorResponse(recaptchaResult, corsHeaders);
      }
    }

    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
    if (!GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY not configured');
    }

    // Build context-aware system prompt
    const systemPrompt = `You are an expert learning assistant for "${moduleContext?.courseTitle || 'Quantum Club Academy'}".

${moduleContext ? `
Current Module: ${moduleContext.title}
${moduleContext.description ? `Description: ${moduleContext.description}` : ''}
${moduleContext.learningPathTitle ? `Learning Path: ${moduleContext.learningPathTitle}` : ''}
${moduleContext.content ? `Module Content Summary:\n${moduleContext.content.slice(0, 1000)}...` : ''}
` : ''}

Your role:
- Answer questions clearly and concisely about this module's content
- Provide deeper explanations when requested
- Generate examples and analogies to clarify concepts
- Suggest related topics and resources
- Create actionable learning tips
- When unsure, acknowledge limitations and recommend asking an expert

Keep responses focused, practical, and encouraging. Use markdown formatting for clarity.`;

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GOOGLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorMessage = response.status === 429 ? 'AI rate limit exceeded' :
                          response.status === 402 ? 'AI quota exceeded' :
                          'AI service error';
      await logAIUsage({
        userId,
        functionName: 'module-ai-assistant',
        ...clientInfo,
        responseTimeMs: Date.now() - startTime,
        success: false,
        errorMessage
      });

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI quota exceeded. Please contact support.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log successful usage
    await logAIUsage({
      userId,
      functionName: 'module-ai-assistant',
      ...clientInfo,
      responseTimeMs: Date.now() - startTime,
      success: true
    });

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error('Module AI assistant error:', error);
    await logAIUsage({
      userId,
      functionName: 'module-ai-assistant',
      ...clientInfo,
      responseTimeMs: Date.now() - startTime,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
