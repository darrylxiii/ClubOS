import { createAuthenticatedHandler } from '../_shared/handler.ts';
import { checkUserRateLimit, createRateLimitResponse } from '../_shared/rate-limiter.ts';
import { logAIUsage, extractClientInfo } from '../_shared/ai-logger.ts';

Deno.serve(createAuthenticatedHandler(async (req, ctx) => {
  const startTime = Date.now();
  const clientInfo = extractClientInfo(req);
  const userId = ctx.user.id;

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
    return createRateLimitResponse(rateLimit.retryAfter!, ctx.corsHeaders);
  }

  const { postId, content, type } = await req.json();

  if (!postId || !content) {
    return new Response(
      JSON.stringify({ error: 'Missing postId or content' }),
      { status: 400, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
  if (!GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY not configured');
  }

  // Determine system prompt based on type
  const systemPrompt = type === 'repost_with_commentary'
    ? 'You are a helpful assistant that summarizes reposts. Create a 2-3 sentence summary that first states what the original post was about, then explains what perspective the person reposting added.'
    : 'You are a helpful assistant that summarizes posts. Create a 2-3 sentence summary of the content.';

  console.log('[generate-ai-summary] Calling Google Gemini for post:', postId);

  const aiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GOOGLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gemini-2.5-flash-lite',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: content }
      ],
      max_tokens: 150
    }),
  });

  if (!aiResponse.ok) {
    const errorMessage = aiResponse.status === 429 ? 'AI rate limit exceeded' :
                        aiResponse.status === 402 ? 'AI quota exceeded' :
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
  const { error: updateError } = await ctx.supabase
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
    { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
  );
}));
