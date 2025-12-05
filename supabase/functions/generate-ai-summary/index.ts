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
    console.log('[generate-ai-summary] Processing request');
    
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('[generate-ai-summary] No auth header');
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
      console.log('[generate-ai-summary] Auth failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    userId = user.id;

    // Rate limiting: 50 requests per hour (lightweight operation)
    const rateLimit = await checkUserRateLimit(userId, 'generate-ai-summary', 50);
    if (!rateLimit.allowed) {
      console.log('[generate-ai-summary] Rate limit exceeded for user:', userId);
      await logAIUsage({
        userId,
        functionName: 'generate-ai-summary',
        ...clientInfo,
        rateLimitHit: true,
        success: false,
        errorMessage: 'Rate limit exceeded'
      });
      return createRateLimitResponse(rateLimit.retryAfter!, publicCorsHeaders);
    }

    const { postId, content, type } = await req.json();

    if (!postId || !content) {
      return new Response(
        JSON.stringify({ error: 'Missing postId or content' }),
        { status: 400, headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Determine system prompt based on type
    const systemPrompt = type === 'repost_with_commentary'
      ? 'You are a helpful assistant that summarizes reposts. Create a 2-3 sentence summary that first states what the original post was about, then explains what perspective the person reposting added.'
      : 'You are a helpful assistant that summarizes posts. Create a 2-3 sentence summary of the content.';

    console.log('[generate-ai-summary] Calling Lovable AI for post:', postId);

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: content }
        ],
        max_tokens: 150
      }),
    });

    if (!aiResponse.ok) {
      const errorMessage = aiResponse.status === 429 ? 'AI rate limit exceeded' :
                          aiResponse.status === 402 ? 'AI credits exhausted' :
                          'AI service error';
      
      await logAIUsage({
        userId,
        functionName: 'generate-ai-summary',
        ...clientInfo,
        responseTimeMs: Date.now() - startTime,
        success: false,
        errorMessage
      });

      const errorText = await aiResponse.text();
      console.error('[generate-ai-summary] AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API returned ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices?.[0]?.message?.content;

    if (!summary) {
      throw new Error('No summary generated');
    }

    // Update post with AI summary
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error: updateError } = await supabase
      .from('posts')
      .update({ 
        ai_summary: summary.trim(),
        summary_generated_at: new Date().toISOString()
      })
      .eq('id', postId);

    if (updateError) {
      console.error('[generate-ai-summary] Database update error:', updateError);
      throw updateError;
    }

    await logAIUsage({
      userId,
      functionName: 'generate-ai-summary',
      ...clientInfo,
      responseTimeMs: Date.now() - startTime,
      success: true
    });

    console.log('[generate-ai-summary] Summary generated and saved successfully');

    return new Response(
      JSON.stringify({ success: true, summary: summary.trim() }),
      { headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-ai-summary] Error:', error);
    await logAIUsage({
      userId,
      functionName: 'generate-ai-summary',
      ...clientInfo,
      responseTimeMs: Date.now() - startTime,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...publicCorsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
