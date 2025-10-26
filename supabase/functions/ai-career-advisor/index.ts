import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { checkUserRateLimit, createRateLimitResponse } from '../_shared/rate-limiter.ts';
import { verifyRecaptcha, createRecaptchaErrorResponse } from '../_shared/recaptcha-verifier.ts';
import { logAIUsage, extractClientInfo } from '../_shared/ai-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const clientInfo = extractClientInfo(req);
  let userId: string | undefined;

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      await logAIUsage({
        functionName: 'ai-career-advisor',
        ...clientInfo,
        success: false,
        errorMessage: 'No authorization header'
      });
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    
    if (authError || !user) {
      await logAIUsage({
        functionName: 'ai-career-advisor',
        ...clientInfo,
        success: false,
        errorMessage: 'Authentication failed'
      });
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    userId = user.id;

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
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user profile for context
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // Call Lovable AI
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
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
                          response.status === 402 ? 'AI credits exhausted' :
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
          JSON.stringify({ error: 'AI credits exhausted. Please add funds to your Lovable workspace.' }),
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

  } catch (error) {
    console.error('Error in ai-career-advisor:', error);
    await logAIUsage({
      userId,
      functionName: 'ai-career-advisor',
      ...clientInfo,
      responseTimeMs: Date.now() - startTime,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to process request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
