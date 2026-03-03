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

    // Get published posts
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
      // Get last 30 days analytics using correct column names
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      const { data: analytics } = await supabase
        .from('blog_analytics')
        .select('*')
        .eq('post_slug', post.slug)
        .gte('date', thirtyDaysAgo);

      const rows = analytics || [];
      const totalViews = rows.reduce((sum: number, a: any) => sum + (a.page_views || 0), 0);
      const avgScroll = rows.length > 0
        ? rows.reduce((sum: number, a: any) => sum + (a.scroll_depth || 0), 0) / rows.length
        : 0;
      const totalClicks = rows.reduce((sum: number, a: any) => sum + (a.cta_clicks || 0), 0);
      const avgBounceRate = rows.length > 0
        ? rows.reduce((sum: number, a: any) => sum + (a.bounce_rate || 0), 0) / rows.length
        : 1; // Default to 100% bounce if no data

      // Performance score: views + engagement + clicks + retention
      const score = Math.min(100, Math.round(
        (totalViews * 0.3) +
        (avgScroll * 0.3) +
        (totalClicks * 10 * 0.2) +
        ((1 - avgBounceRate) * 100 * 0.2)
      ));

      await supabase
        .from('blog_posts')
        .update({ performance_score: score })
        .eq('id', post.id);

      results.push({
        slug: post.slug,
        score,
        views: totalViews,
        avgScroll: Math.round(avgScroll),
        ctaClicks: totalClicks,
        bounceRate: Math.round(avgBounceRate * 100),
      });
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
