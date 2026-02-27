import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { autoQueue } = await req.json();

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    // Get existing posts for gap analysis
    const { data: existingPosts } = await supabase
      .from('blog_posts')
      .select('title, category, keywords')
      .order('created_at', { ascending: false })
      .limit(50);

    const existingTopics = (existingPosts || []).map((p: any) => p.title).join(', ');

    const prompt = `Given these existing articles: [${existingTopics}]

Suggest 5 new article topics for The Quantum Club blog (a luxury talent platform). Categories: career-insights, talent-strategy, industry-trends, leadership.

For each, return using the provided tool.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        tools: [
          {
            type: 'function',
            function: {
              name: 'suggest_topics',
              description: 'Return 5 blog topic suggestions',
              parameters: {
                type: 'object',
                properties: {
                  suggestions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        topic: { type: 'string' },
                        category: { type: 'string' },
                        format: { type: 'string', enum: ['career-playbook', 'market-analysis', 'trend-report', 'success-story', 'myth-buster', 'talent-origin', 'executive-stack'] },
                        targetKeywords: { type: 'array', items: { type: 'string' } },
                        priority: { type: 'number' },
                        reasoning: { type: 'string' },
                      },
                      required: ['topic', 'category', 'format', 'targetKeywords', 'priority', 'reasoning'],
                      additionalProperties: false,
                    },
                  },
                },
                required: ['suggestions'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'suggest_topics' } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded', code: 'AI_RATE_LIMITED' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted', code: 'AI_CREDITS_EXHAUSTED' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI suggestion failed: ${response.statusText}`);
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    let suggestions;
    if (toolCall) {
      const parsed = JSON.parse(toolCall.function.arguments);
      suggestions = parsed.suggestions;
    } else {
      const parsed = JSON.parse(aiResult.choices[0].message.content);
      suggestions = parsed.suggestions || parsed;
    }

    if (autoQueue && Array.isArray(suggestions)) {
      for (const s of suggestions) {
        await supabase.from('blog_generation_queue').insert({
          topic: s.topic,
          category: s.category,
          target_keywords: s.targetKeywords,
          priority: s.priority,
          content_format: s.format,
          source: 'ai_suggestion',
          status: 'pending',
        });
      }
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Blog suggest error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
