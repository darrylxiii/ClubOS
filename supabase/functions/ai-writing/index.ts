import { createHandler } from '../_shared/handler.ts';
import { fetchAI, handleAIError, createTimeoutResponse, AITimeoutError } from '../_shared/ai-fetch.ts';

type AIOperation = 'improve' | 'summarize' | 'expand' | 'translate' | 'generate' | 'simplify' | 'professional' | 'casual';

interface AIWritingRequest {
  operation: AIOperation;
  text: string;
  context?: string;
  targetLanguage?: string;
  customPrompt?: string;
}

const getSystemPrompt = (operation: AIOperation, targetLanguage?: string): string => {
  const prompts: Record<AIOperation, string> = {
    improve: `You are Club AI, an AI writing assistant for The Quantum Club.
Your task is to improve the given text while maintaining its original meaning and tone.
Focus on:
- Clearer sentence structure
- Better word choices
- Improved flow and readability
- Fixing any grammar or spelling issues
Return ONLY the improved text, no explanations.`,

    summarize: `You are Club AI, an AI writing assistant for The Quantum Club.
Your task is to summarize the given text concisely.
Create a clear, brief summary that captures the key points.
Return ONLY the summary, no explanations.`,

    expand: `You are Club AI, an AI writing assistant for The Quantum Club.
Your task is to expand the given text with more detail and depth.
Add relevant examples, explanations, or context while maintaining the original voice.
Return ONLY the expanded text, no explanations.`,

    translate: `You are Club AI, an AI writing assistant for The Quantum Club.
Your task is to translate the given text to ${targetLanguage || 'English'}.
Maintain the original tone and meaning.
Return ONLY the translated text, no explanations.`,

    generate: `You are Club AI, an AI writing assistant for The Quantum Club.
Your task is to generate content based on the user's request.
Write clear, professional content that matches the context.
Return ONLY the generated content, no explanations.`,

    simplify: `You are Club AI, an AI writing assistant for The Quantum Club.
Your task is to simplify the given text for easier understanding.
Use simpler words and shorter sentences while keeping the meaning.
Return ONLY the simplified text, no explanations.`,

    professional: `You are Club AI, an AI writing assistant for The Quantum Club.
Your task is to rewrite the given text in a more professional tone.
Make it suitable for business or formal contexts.
Return ONLY the rewritten text, no explanations.`,

    casual: `You are Club AI, an AI writing assistant for The Quantum Club.
Your task is to rewrite the given text in a more casual, friendly tone.
Make it conversational and approachable.
Return ONLY the rewritten text, no explanations.`,
  };

  return prompts[operation];
};

Deno.serve(createHandler(async (req, ctx) => {
  const { operation, text, context, targetLanguage, customPrompt }: AIWritingRequest = await req.json();

  if (!operation || !text) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: operation and text' }),
      { status: 400, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`[AI Writing] Operation: ${operation}, Text length: ${text.length}`);

  const systemPrompt = getSystemPrompt(operation, targetLanguage);
  let userPrompt = text;

  if (operation === 'generate' && customPrompt) {
    userPrompt = customPrompt;
  }

  if (context) {
    userPrompt = `Context: ${context}\n\nText: ${text}`;
  }

  try {
    const response = await fetchAI({
      model: 'gemini-2.5-flash-lite',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }, { timeoutMs: 30000 });

    // Handle rate limit and payment errors
    const errorResponse = handleAIError(response, ctx.corsHeaders);
    if (errorResponse) return errorResponse;

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AI Writing] API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI service error', details: errorText }),
        { status: 500, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content;

    if (!result) {
      return new Response(
        JSON.stringify({ error: 'No content generated' }),
        { status: 500, headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[AI Writing] Success, result length: ${result.length}`);

    return new Response(
      JSON.stringify({
        result,
        operation,
        originalLength: text.length,
        resultLength: result.length,
      }),
      { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[AI Writing] Error:', error);

    if (error instanceof AITimeoutError) {
      return createTimeoutResponse(ctx.corsHeaders);
    }

    throw error;
  }
}));
