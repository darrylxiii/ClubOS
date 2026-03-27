import { createHandler } from '../_shared/handler.ts';

Deno.serve(createHandler(async (req, ctx) => {
  const { text } = await req.json();
  const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');

  if (!GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY not configured');
  }

  console.log('Analyzing sentiment for text:', text.substring(0, 50) + '...');

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
          content: 'You are a sentiment analysis assistant. Analyze the sentiment of messages and respond with a JSON object containing: sentiment (positive/neutral/negative), score (0-1), and brief explanation.'
        },
        {
          role: 'user',
          content: `Analyze the sentiment of this message: "${text}"`
        }
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'analyze_sentiment',
          description: 'Analyze message sentiment',
          parameters: {
            type: 'object',
            properties: {
              sentiment: {
                type: 'string',
                enum: ['positive', 'neutral', 'negative']
              },
              score: {
                type: 'number',
                description: 'Sentiment score from 0 (negative) to 1 (positive)'
              },
              explanation: {
                type: 'string',
                description: 'Brief explanation of the sentiment analysis'
              }
            },
            required: ['sentiment', 'score', 'explanation']
          }
        }
      }],
      tool_choice: { type: 'function', function: { name: 'analyze_sentiment' } }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI API error:', response.status, errorText);
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('AI response:', JSON.stringify(data));

  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) {
    throw new Error('No tool call in response');
  }

  const result = JSON.parse(toolCall.function.arguments);
  console.log('Sentiment analysis result:', result);

  return new Response(
    JSON.stringify(result),
    { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
  );
}));
