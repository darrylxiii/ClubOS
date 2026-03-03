import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Simple Levenshtein distance for dedup
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
  }
  return matrix[b.length][a.length];
}

function similarity(a: string, b: string): number {
  const la = a.toLowerCase().trim();
  const lb = b.toLowerCase().trim();
  const maxLen = Math.max(la.length, lb.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(la, lb) / maxLen;
}

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
      .limit(100);

    // Also get pending queue items for dedup
    const { data: pendingQueue } = await supabase
      .from('blog_generation_queue')
      .select('topic')
      .in('status', ['pending', 'generating']);

    const existingTitles = (existingPosts || []).map((p: any) => p.title);
    const pendingTopics = (pendingQueue || []).map((q: any) => q.topic);
    const allExistingTopics = [...existingTitles, ...pendingTopics];

    const existingTopics = existingTitles.join(', ');
    const existingCategories = (existingPosts || []).map((p: any) => p.category);
    const categoryCounts: Record<string, number> = {};
    existingCategories.forEach((c: string) => { categoryCounts[c] = (categoryCounts[c] || 0) + 1; });

    const underservedCategory = Object.entries({
      'career-insights': categoryCounts['career-insights'] || 0,
      'talent-strategy': categoryCounts['talent-strategy'] || 0,
      'industry-trends': categoryCounts['industry-trends'] || 0,
      'leadership': categoryCounts['leadership'] || 0,
    }).sort((a, b) => a[1] - b[1]).map(e => e[0]);

    const prompt = `Given these existing articles: [${existingTopics}]

Categories ranked by content gap (least content first): ${underservedCategory.join(', ')}

Suggest 10 new article topics for The Quantum Club blog (a luxury invite-only talent platform for top-tier professionals). Prioritize underserved categories. Think in topic clusters: create pillar content and supporting articles.

Categories: career-insights, talent-strategy, industry-trends, leadership.
Formats: career-playbook, market-analysis, trend-report, success-story, myth-buster, talent-origin, executive-stack.

For each, return using the provided tool. Include a cluster_id to group related topics together.`;

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
              description: 'Return 10 blog topic suggestions with cluster grouping',
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
                        clusterId: { type: 'string', description: 'Group related topics under a cluster name' },
                        isPillar: { type: 'boolean', description: 'True if this is a pillar/cornerstone article' },
                      },
                      required: ['topic', 'category', 'format', 'targetKeywords', 'priority', 'reasoning'],
                    },
                  },
                },
                required: ['suggestions'],
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

    // Dedup: filter out suggestions too similar to existing posts or pending queue
    if (Array.isArray(suggestions)) {
      const SIMILARITY_THRESHOLD = 0.8;
      suggestions = suggestions.filter((s: any) => {
        for (const existing of allExistingTopics) {
          if (similarity(s.topic, existing) >= SIMILARITY_THRESHOLD) {
            console.log(`Dedup: rejected "${s.topic}" (too similar to "${existing}")`);
            return false;
          }
        }
        return true;
      });
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
