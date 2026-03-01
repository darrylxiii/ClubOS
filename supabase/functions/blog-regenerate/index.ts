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
    const { postId } = await req.json();
    if (!postId) throw new Error('postId is required');

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Read existing post
    const { data: post, error: fetchError } = await supabase
      .from('blog_posts')
      .select('id, title, category, keywords, content_format, slug')
      .eq('id', postId)
      .single();

    if (fetchError || !post) {
      throw new Error(`Post not found: ${fetchError?.message || postId}`);
    }

    // Call blog-generate to produce new content
    const generateUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/blog-generate`;
    const response = await fetch(generateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        topic: post.title,
        category: post.category,
        targetKeywords: post.keywords || [],
        contentFormat: post.content_format || 'deep-dive',
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`blog-generate failed (${response.status}): ${errBody}`);
    }

    const result = await response.json();
    if (!result.success || !result.postId) {
      throw new Error(result.error || 'Generation returned no post');
    }

    // Read the newly generated post's content
    const { data: newPost, error: newFetchError } = await supabase
      .from('blog_posts')
      .select('content, excerpt, key_takeaways, meta_title, meta_description, faq_schema, keywords, author_id, status')
      .eq('id', result.postId)
      .single();

    if (newFetchError || !newPost) {
      throw new Error(`Failed to read generated post: ${newFetchError?.message}`);
    }

    // Update the original post in-place with new content
    const { error: updateError } = await supabase
      .from('blog_posts')
      .update({
        content: newPost.content,
        excerpt: newPost.excerpt,
        key_takeaways: newPost.key_takeaways,
        meta_title: newPost.meta_title,
        meta_description: newPost.meta_description,
        faq_schema: newPost.faq_schema,
        keywords: newPost.keywords,
        author_id: newPost.author_id,
        status: newPost.status === 'failed' ? 'failed' : 'draft',
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId);

    if (updateError) throw updateError;

    // Delete the temporary new post (we copied its content to the original)
    await supabase.from('blog_posts').delete().eq('id', result.postId);

    console.log(`Blog regenerated: "${post.title}" (${postId}) | quality: ${newPost.status === 'failed' ? 'FAIL' : 'PASS'}`);

    return new Response(
      JSON.stringify({ success: true, postId, title: post.title, qualityPass: newPost.status !== 'failed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Blog regenerate error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Regeneration failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
