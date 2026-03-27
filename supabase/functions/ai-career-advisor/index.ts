import { createAuthenticatedHandler } from '../_shared/handler.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { checkUserRateLimit, createRateLimitResponse } from '../_shared/rate-limiter.ts';
import { verifyRecaptcha, createRecaptchaErrorResponse } from '../_shared/recaptcha-verifier.ts';
import { logAIUsage, extractClientInfo } from '../_shared/ai-logger.ts';

Deno.serve(createAuthenticatedHandler(async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const startTime = Date.now();
  const clientInfo = extractClientInfo(req);
  const userId = ctx.user.id;

    // Rate limiting: 10 requests per hour
    const rateLimit = await checkUserRateLimit(userId, 'ai-career-advisor', 10);
    if (!rateLimit.allowed) {
      await logAIUsage({
        userId,
        functionName: 'ai-career-advisor',
        ...clientInfo,
        rateLimitHit: true,
        success: false,
        errorMessage: 'Rate limit exceeded'
      });
      return createRateLimitResponse(rateLimit.retryAfter!, corsHeaders);
    }
    // Validate input
    const requestSchema = z.object({
      messages: z.array(z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string().min(1).max(10000)
      })).min(1).max(50),
      conversationId: z.string().uuid().optional(),
      userId: z.string().uuid(),
      recaptchaToken: z.string().optional()
    });

    const { messages, conversationId, recaptchaToken } = requestSchema.parse(await req.json());

    // reCAPTCHA verification
    if (recaptchaToken) {
      const recaptchaResult = await verifyRecaptcha(recaptchaToken, 'career_advisor', 0.5);
      if (!recaptchaResult.success) {
        await logAIUsage({
          userId,
          functionName: 'ai-career-advisor',
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

    const supabase = ctx.supabase;

    // Get user profile for context
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // Call Google Gemini
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GOOGLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: `You are a career advisor for The Quantum Club, an elite talent platform. 
            
User context: ${profile ? `Name: ${profile.full_name}, Title: ${profile.title}, Skills: ${profile.skills?.join(', ')}` : 'New user'}

Provide personalized career advice focused on:
- Job search strategy
- Resume and profile optimization
- Interview preparation
- Salary negotiation
- Career growth paths

Keep responses concise (under 200 words), actionable, and encouraging. Always suggest one concrete next step.`
          },
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
        functionName: 'ai-career-advisor',
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
          JSON.stringify({ error: 'AI quota exceeded. Please check your Google API billing.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    // Log successful usage
    await logAIUsage({
      userId,
      functionName: 'ai-career-advisor',
      ...clientInfo,
      responseTimeMs: Date.now() - startTime,
      success: true
    });

    // Save conversation
    if (conversationId) {
      await supabase
        .from('ai_conversations')
        .update({
          messages: [...messages, { role: 'assistant', content: 'Streaming response...' }],
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

}));
