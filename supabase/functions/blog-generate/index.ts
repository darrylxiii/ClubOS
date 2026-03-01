import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const authorRotation = [
  { id: 'tqc-editorial', name: 'TQC Editorial', credentials: 'The Quantum Club' },
  { id: 'alexandra-chen', name: 'Alexandra Chen', credentials: 'Talent Strategy Lead' },
  { id: 'marcus-williams', name: 'Marcus Williams', credentials: 'Career Intelligence Director' },
];

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

    // Rotate authors
    const author = authorRotation[Math.floor(Math.random() * authorRotation.length)];

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    // Get recent posts for internal linking suggestions
    const { data: recentPosts } = await supabase
      .from('blog_posts')
      .select('slug, title, category')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(20);

    const existingArticles = (recentPosts || []).map(p => `"${p.title}" (/blog/${p.category}/${p.slug})`).join('\n');

    const systemPrompt = `You are the editorial AI for The Quantum Club, a luxury invite-only talent platform connecting top-tier professionals with exceptional career opportunities.

Writing standards:
- Tone: calm, discreet, competent. Never use exclamation points.
- Every paragraph MUST contain a concrete insight, statistic, data point, or actionable recommendation. Never pad with generic filler.
- Include at least 3 named companies or leaders as real-world examples.
- Include at least 5 specific statistics or data points with context (e.g. "McKinsey found that 67% of...").
- Target: 2000+ words with 8-12 H2/H3 sections.
- End with actionable takeaways the reader can implement this week.
- Format: ${format}.

You write for senior professionals and C-suite executives who value substance over fluff.`;

    const userPrompt = `Write a comprehensive, in-depth article about: "${topic}"
Category: ${category}
Target keywords: ${(targetKeywords || []).join(', ')}
Author: ${author.name}, ${author.credentials}

Requirements:
- Minimum 15 content blocks (paragraphs, headings, lists, quotes combined)
- 8-12 H2/H3 sections with substantive content under each
- At least 3 named companies or leaders as examples
- At least 5 specific statistics with sources
- Include 1-2 compelling pullquotes as "quote" blocks
- End with actionable takeaways as a list block

Existing articles for internal linking (reference 2-3 where relevant):
${existingArticles}

Return the article using the provided tool. Include 3-5 FAQ pairs for structured data.

CRITICAL - Use these exact field names for ContentBlock objects:
- { "type": "paragraph", "content": "The paragraph text..." }
- { "type": "heading", "content": "Section Title", "level": 2 }
- { "type": "heading", "content": "Subsection Title", "level": 3 }
- { "type": "quote", "content": "The quote text", "caption": "Speaker Name, Title" }
- { "type": "list", "content": "Optional list introduction", "items": ["Item 1", "Item 2", "Item 3"] }
- { "type": "callout", "content": "Key insight or important tip text" }

The field for text content is ALWAYS "content", never "text". The field for quote attribution is ALWAYS "caption", never "attribution".`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
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
              description: 'Create a structured blog article with FAQ schema',
              parameters: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  excerpt: { type: 'string', description: 'Short 1-2 sentence summary' },
                  content: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        type: { type: 'string', enum: ['paragraph', 'heading', 'quote', 'list', 'callout', 'image'] },
                        content: { type: 'string', description: 'Main text content of the block. Required for all block types.' },
                        level: { type: 'number', description: 'Heading level (2, 3, or 4). Required for heading blocks.' },
                        items: { type: 'array', items: { type: 'string' }, description: 'List items. Required for list blocks.' },
                        caption: { type: 'string', description: 'Attribution for quotes or caption for images.' },
                      },
                      required: ['type', 'content'],
                    },
                    description: 'Array of ContentBlock objects. Must have at least 15 blocks.',
                  },
                  keyTakeaways: { type: 'array', items: { type: 'string' } },
                  metaTitle: { type: 'string', description: 'Under 60 chars, include primary keyword' },
                  metaDescription: { type: 'string', description: 'Under 160 chars, compelling and keyword-rich' },
                  keywords: { type: 'array', items: { type: 'string' } },
                  faqSchema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        question: { type: 'string' },
                        answer: { type: 'string' },
                      },
                      required: ['question', 'answer'],
                    },
                    description: '3-5 FAQ pairs for Google structured data',
                  },
                },
                required: ['title', 'excerpt', 'content', 'keyTakeaways', 'metaTitle', 'metaDescription', 'keywords', 'faqSchema'],
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
    
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    let content;
    if (toolCall) {
      content = JSON.parse(toolCall.function.arguments);
    } else {
      content = JSON.parse(aiResult.choices[0].message.content);
    }

    // --- Post-generation validation ---
    const blocks = content.content || [];
    
    // Normalize: if AI used "text" instead of "content", fix it
    for (const block of blocks) {
      if (!block.content && block.text) {
        block.content = block.text;
        delete block.text;
      }
      if (block.attribution && !block.caption) {
        block.caption = block.attribution;
        delete block.attribution;
      }
    }

    const totalChars = blocks.reduce((sum: number, b: any) => sum + (b.content?.length || 0), 0);
    const headingCount = blocks.filter((b: any) => b.type === 'heading').length;
    const blockCount = blocks.length;

    const qualityPass = totalChars >= 6000 && blockCount >= 12 && headingCount >= 3;

    // Insert blog post
    const { data: post, error: insertError } = await supabase
      .from('blog_posts')
      .insert({
        slug,
        title: content.title,
        excerpt: content.excerpt,
        category,
        content: blocks,
        hero_image: { url: '/placeholder.svg', alt: content.title },
        keywords: content.keywords,
        key_takeaways: content.keyTakeaways,
        meta_title: content.metaTitle,
        meta_description: content.metaDescription,
        faq_schema: content.faqSchema || [],
        author_id: author.id,
        status: qualityPass ? 'draft' : 'failed',
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
          status: qualityPass ? 'completed' : 'failed',
          generated_post_id: post.id,
          error_message: qualityPass ? null : `Quality check failed: ${totalChars} chars (need 6000+), ${blockCount} blocks (need 12+), ${headingCount} headings (need 3+)`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', queueId);
    }

    console.log(`Blog generated: "${content.title}" | ${blockCount} blocks, ${totalChars} chars, ${headingCount} headings | quality: ${qualityPass ? 'PASS' : 'FAIL'}`);

    return new Response(
      JSON.stringify({ success: true, postId: post.id, title: post.title, slug: post.slug, qualityPass }),
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
