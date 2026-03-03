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
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { limit = 5, dryRun = false } = await req.json().catch(() => ({}));

    // Find posts with placeholder images
    const { data: posts, error } = await supabase
      .from('blog_posts')
      .select('id, title, slug, category, hero_image')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (error) throw error;

    // Filter to only placeholder images
    const needsImage = (posts || []).filter((p: any) => {
      const hero = p.hero_image as { url?: string } | null;
      return !hero?.url || hero.url === '/placeholder.svg';
    });

    if (dryRun) {
      return new Response(JSON.stringify({
        total: needsImage.length,
        posts: needsImage.map((p: any) => ({ id: p.id, title: p.title, slug: p.slug })),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const batch = needsImage.slice(0, Math.min(limit, 10));
    const results: any[] = [];
    const imageGenUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/blog-generate-image`;

    for (const post of batch) {
      try {
        const prompt = `${post.title} - ${post.category} - professional editorial`;
        
        const response = await fetch(imageGenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({ postId: post.id, prompt }),
        });

        if (response.status === 429) {
          results.push({ id: post.id, slug: post.slug, status: 'rate_limited' });
          // Wait 15 seconds before continuing
          await new Promise(r => setTimeout(r, 15000));
          continue;
        }

        if (!response.ok) {
          results.push({ id: post.id, slug: post.slug, status: 'error', error: response.statusText });
          continue;
        }

        const result = await response.json();
        results.push({ id: post.id, slug: post.slug, status: 'success', imageUrl: result.imageUrl });

        // Rate limit: wait 3 seconds between generations
        if (batch.indexOf(post) < batch.length - 1) {
          await new Promise(r => setTimeout(r, 3000));
        }
      } catch (err) {
        results.push({ id: post.id, slug: post.slug, status: 'error', error: err.message });
      }
    }

    return new Response(JSON.stringify({
      processed: results.length,
      remaining: needsImage.length - batch.length,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Blog backfill images error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
