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

    // Get all published posts
    const { data: posts } = await supabase
      .from('blog_posts')
      .select('id, slug, title, category, keywords, key_takeaways')
      .eq('status', 'published');

    if (!posts || posts.length < 2) {
      return new Response(JSON.stringify({ message: 'Not enough posts for relations' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Simple keyword-based similarity
    let relationsCreated = 0;

    for (const post of posts) {
      const postKeywords = new Set([
        ...(post.keywords || []),
        ...(post.key_takeaways || []).flatMap((t: string) => t.toLowerCase().split(' ')),
        post.category,
      ]);

      const scored = posts
        .filter((p: any) => p.id !== post.id)
        .map((other: any) => {
          const otherKeywords = new Set([
            ...(other.keywords || []),
            ...(other.key_takeaways || []).flatMap((t: string) => t.toLowerCase().split(' ')),
            other.category,
          ]);

          let overlap = 0;
          for (const kw of postKeywords) {
            if (otherKeywords.has(kw)) overlap++;
          }

          const score = overlap / Math.max(postKeywords.size, 1);
          return { relatedPostId: other.id, score };
        })
        .filter((r: any) => r.score > 0.1)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 5);

      for (const rel of scored) {
        await supabase
          .from('blog_post_relations')
          .upsert({
            source_post_id: post.id,
            related_post_id: rel.relatedPostId,
            similarity_score: Math.round(rel.score * 100) / 100,
            relation_type: post.category === posts.find((p: any) => p.id === rel.relatedPostId)?.category ? 'same-category' : 'cross-category',
          }, { onConflict: 'source_post_id,related_post_id' });
        relationsCreated++;
      }
    }

    return new Response(JSON.stringify({ relationsCreated }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Blog relate error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
