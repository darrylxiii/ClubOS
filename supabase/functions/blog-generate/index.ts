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
    const { queueId, topic, category, targetKeywords, contentFormat } = await req.json();

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Update queue status
    if (queueId) {
      await supabase
        .from('blog_generation_queue')
        .update({ status: 'generating', updated_at: new Date().toISOString() })
        .eq('id', queueId);
    }

    const format = contentFormat || 'deep-dive';
    const slug = topic
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const systemPrompt = `You are the editorial AI for The Quantum Club, a luxury invite-only talent platform. Write professional career and talent content. Tone: calm, discreet, competent. No exclamation points. Format: ${format}.`;

    const userPrompt = `Write a comprehensive article about: "${topic}"
Category: ${category}
Target keywords: ${(targetKeywords || []).join(', ')}

Return the article as structured data using the provided tool.

ContentBlock types:
- { type: "heading", level: 2|3, text: "..." }
- { type: "paragraph", text: "..." }
- { type: "list", style: "bullet"|"number", items: ["..."] }
- { type: "quote", text: "...", attribution: "..." }
- { type: "callout", variant: "tip"|"warning"|"info", title: "...", content: "..." }`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        tools: [
          {
            type: 'function',
            function: {
              name: 'create_article',
              description: 'Create a structured blog article',
              parameters: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  excerpt: { type: 'string', description: 'Short 1-2 sentence summary' },
                  content: {
                    type: 'array',
                    items: { type: 'object' },
                    description: 'Array of ContentBlock objects',
                  },
                  keyTakeaways: { type: 'array', items: { type: 'string' } },
                  metaTitle: { type: 'string', description: 'Under 60 chars' },
                  metaDescription: { type: 'string', description: 'Under 160 chars' },
                  keywords: { type: 'array', items: { type: 'string' } },
                },
                required: ['title', 'excerpt', 'content', 'keyTakeaways', 'metaTitle', 'metaDescription', 'keywords'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'create_article' } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'AI rate limit exceeded. Please try again later.', code: 'AI_RATE_LIMITED' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add funds.', code: 'AI_CREDITS_EXHAUSTED' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI generation failed: ${response.statusText}`);
    }

    const aiResult = await response.json();
    
    // Extract from tool call
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    let content;
    if (toolCall) {
      content = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: try parsing message content
      content = JSON.parse(aiResult.choices[0].message.content);
    }

    // Insert blog post
    const { data: post, error: insertError } = await supabase
      .from('blog_posts')
      .insert({
        slug,
        title: content.title,
        excerpt: content.excerpt,
        category,
        content: content.content,
        hero_image: { url: '/placeholder.svg', alt: content.title },
        keywords: content.keywords,
        key_takeaways: content.keyTakeaways,
        meta_title: content.metaTitle,
        meta_description: content.metaDescription,
        status: 'draft',
        ai_generated: true,
        performance_score: 0,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Update queue
    if (queueId) {
      await supabase
        .from('blog_generation_queue')
        .update({
          status: 'completed',
          generated_post_id: post.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', queueId);
    }

    return new Response(
      JSON.stringify({ success: true, postId: post.id, title: post.title, slug: post.slug }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Blog generate error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Generation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
