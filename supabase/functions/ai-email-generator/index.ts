import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { publicCorsHeaders, handleCorsPreFlight } from '../_shared/cors-config.ts';
import { checkUserRateLimit, createRateLimitResponse } from '../_shared/rate-limiter.ts';
import { logAIUsage, extractClientInfo } from '../_shared/ai-logger.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight(publicCorsHeaders);
  }

  const startTime = Date.now();
  const clientInfo = extractClientInfo(req);
  let userId: string | undefined;

  try {
    console.log('[ai-email-generator] Processing request');
    
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('[ai-email-generator] No auth header');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    
    if (authError || !user) {
      console.log('[ai-email-generator] Auth failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    userId = user.id;

    // Rate limiting: 20 requests per hour
    const rateLimit = await checkUserRateLimit(userId, 'ai-email-generator', 20);
    if (!rateLimit.allowed) {
      console.log('[ai-email-generator] Rate limit exceeded for user:', userId);
      await logAIUsage({
        userId,
        functionName: 'ai-email-generator',
        ...clientInfo,
        rateLimitHit: true,
        success: false,
        errorMessage: 'Rate limit exceeded'
      });
      return createRateLimitResponse(rateLimit.retryAfter!, publicCorsHeaders);
    }

    const { context, emailType, recipientInfo } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompts: Record<string, string> = {
      'follow_up': 'Generate a professional follow-up email after an interview. Be concise, grateful, and show continued interest.',
      'application': 'Generate a compelling job application email. Highlight relevant skills and express genuine interest.',
      'thank_you': 'Generate a thoughtful thank you email. Be sincere and specific about what you appreciated.',
      'introduction': 'Generate a professional introduction email. Be confident yet humble, clear about your value.',
      'response': 'Generate a professional response email. Be courteous and address all points mentioned.'
    };

    console.log('[ai-email-generator] Calling Lovable AI for email type:', emailType);

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
            content: systemPrompts[emailType] || systemPrompts['response']
          },
          {
            role: 'user',
            content: `Context: ${context}\n\nRecipient: ${recipientInfo || 'Hiring Manager'}\n\nGenerate a professional email (subject line and body, max 250 words).`
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorMessage = response.status === 429 ? 'AI rate limit exceeded' :
                          response.status === 402 ? 'AI credits exhausted' :
                          'AI service error';
      
      await logAIUsage({
        userId,
        functionName: 'ai-email-generator',
        ...clientInfo,
        responseTimeMs: Date.now() - startTime,
        success: false,
        errorMessage
      });

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add funds to your Lovable workspace.' }),
          { status: 402, headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const emailContent = data.choices[0]?.message?.content || '';

    await logAIUsage({
      userId,
      functionName: 'ai-email-generator',
      ...clientInfo,
      responseTimeMs: Date.now() - startTime,
      success: true
    });

    console.log('[ai-email-generator] Email generated successfully');

    return new Response(
      JSON.stringify({ emailContent }),
      { headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ai-email-generator] Error:', error);
    await logAIUsage({
      userId,
      functionName: 'ai-email-generator',
      ...clientInfo,
      responseTimeMs: Date.now() - startTime,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate email' }),
      { status: 500, headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
