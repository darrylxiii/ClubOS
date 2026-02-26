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

    // Get existing posts for gap analysis
    const { data: existingPosts } = await supabase
      .from('blog_posts')
      .select('title, category, keywords')
      .order('created_at', { ascending: false })
      .limit(50);

    const existingTopics = (existingPosts || []).map((p: any) => p.title).join(', ');

    const prompt = `Given these existing articles: [${existingTopics}]

Suggest 5 new article topics for The Quantum Club blog (a luxury talent platform). Categories: career-insights, talent-strategy, industry-trends, leadership.

For each, return JSON array with objects: { topic, category, format (career-playbook|market-analysis|trend-report|success-story|myth-buster|talent-origin|executive-stack), targetKeywords (array), priority (1-10), reasoning }.`;

    const response = await fetch('https://api.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) throw new Error(`AI suggestion failed: ${response.statusText}`);

    const aiResult = await response.json();
    const parsed = JSON.parse(aiResult.choices[0].message.content);
    const suggestions = parsed.suggestions || parsed;

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
