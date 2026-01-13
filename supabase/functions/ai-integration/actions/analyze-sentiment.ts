import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const SentimentSchema = z.object({
    text: z.string(),
});

interface ActionContext {
    payload: any;
}

export async function handleAnalyzeSentiment({ payload }: ActionContext) {
    const { text } = SentimentSchema.parse(payload);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
                { role: 'system', content: 'You are a sentiment analysis assistant. Analyze sentiment: positive/neutral/negative, score 0-1, brief explanation.' },
                { role: 'user', content: `Analyze: "${text}"` }
            ],
            tools: [{
                type: 'function',
                function: {
                    name: 'analyze_sentiment',
                    description: 'Analyze message sentiment',
                    parameters: {
                        type: 'object',
                        properties: {
                            sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
                            score: { type: 'number' },
                            explanation: { type: 'string' }
                        },
                        required: ['sentiment', 'score', 'explanation']
                    }
                }
            }],
            tool_choice: { type: 'function', function: { name: 'analyze_sentiment' } }
        }),
    });

    if (!response.ok) throw new Error(`AI API error: ${response.status}`);

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error('No tool call in response');

    return JSON.parse(toolCall.function.arguments);
}
