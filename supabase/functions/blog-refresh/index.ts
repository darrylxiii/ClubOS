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
    const body = await req.json().catch(() => ({}));
    const autoRegenerate = body.autoRegenerate === true;
    const maxRefresh = body.maxRefresh || 3;

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Find stale posts: published > 90 days ago with low performance
    const staleDate = new Date(Date.now() - 90 * 86400000).toISOString();
    const { data: stalePosts } = await supabase
      .from('blog_posts')
      .select('id, slug, title, category, performance_score, published_at')
      .eq('status', 'published')
      .lt('published_at', staleDate)
      .lt('performance_score', 30)
      .order('performance_score', { ascending: true })
      .limit(10);

    if (!stalePosts?.length) {
      return new Response(JSON.stringify({ message: 'No stale posts found', refreshed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: Array<{ id: string; slug: string; status: string }> = [];

    if (autoRegenerate) {
      // Trigger blog-regenerate for the top N stale posts
      const regenerateUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/blog-regenerate`;
      const toRefresh = stalePosts.slice(0, maxRefresh);

      for (const post of toRefresh) {
        try {
          const res = await fetch(regenerateUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({ postId: post.id }),
          });

          const resBody = await res.text();
          if (res.ok) {
            results.push({ id: post.id, slug: post.slug, status: 'regenerated' });
            console.log(`Refreshed: "${post.title}" (score: ${post.performance_score})`);
          } else {
            results.push({ id: post.id, slug: post.slug, status: `error: ${resBody}` });
          }
        } catch (e) {
          results.push({ id: post.id, slug: post.slug, status: `error: ${e.message}` });
        }
      }
    }

    return new Response(JSON.stringify({
      staleCount: stalePosts.length,
      posts: stalePosts,
      refreshed: results.length,
      results: autoRegenerate ? results : undefined,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Blog refresh error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
