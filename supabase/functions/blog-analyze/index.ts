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

    // Get posts with analytics
    const { data: posts } = await supabase
      .from('blog_posts')
      .select('id, slug, title, category, status, published_at')
      .eq('status', 'published');

    if (!posts?.length) {
      return new Response(JSON.stringify({ message: 'No posts to analyze' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = [];

    for (const post of posts) {
      // Get last 30 days analytics
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      const { data: analytics } = await supabase
        .from('blog_analytics')
        .select('*')
        .eq('post_slug', post.slug)
        .gte('date', thirtyDaysAgo);

      const totalViews = (analytics || []).reduce((sum: number, a: any) => sum + (a.views || 0), 0);
      const avgScroll = (analytics || []).reduce((sum: number, a: any) => sum + (a.avg_scroll_depth || 0), 0) / Math.max((analytics || []).length, 1);
      const totalClicks = (analytics || []).reduce((sum: number, a: any) => sum + (a.cta_clicks || 0), 0);
      const completions = (analytics || []).reduce((sum: number, a: any) => sum + (a.completions || 0), 0);

      // Simple performance score
      const score = Math.min(100, Math.round(
        (totalViews * 0.3) + (avgScroll * 0.3) + (totalClicks * 10 * 0.2) + (completions * 5 * 0.2)
      ));

      await supabase
        .from('blog_posts')
        .update({ performance_score: score })
        .eq('id', post.id);

      results.push({ slug: post.slug, score, views: totalViews, avgScroll });
    }

    return new Response(JSON.stringify({ analyzed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Blog analyze error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
