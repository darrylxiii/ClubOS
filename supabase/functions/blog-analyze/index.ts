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

    // Get published posts with their metadata for learning extraction
    const { data: posts } = await supabase
      .from('blog_posts')
      .select('id, slug, title, category, content_format, keywords, status, published_at')
      .eq('status', 'published');

    if (!posts?.length) {
      return new Response(JSON.stringify({ message: 'No posts to analyze' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = [];
    const winningPosts: any[] = [];
    const losingPosts: any[] = [];

    for (const post of posts) {
      // Get last 30 days analytics
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
        : 1;

      // Performance score
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

      // Collect for learnings
      if (score >= 60) {
        winningPosts.push(post);
      } else if (score <= 15) {
        losingPosts.push(post);
      }
    }

    // --- Intelligence Feedback Loop: populate blog_learnings ---
    const learningsInserted = [];

    // Extract winning patterns
    if (winningPosts.length > 0) {
      const winCategories: Record<string, number> = {};
      const winFormats: Record<string, number> = {};
      const winKeywords: Record<string, number> = {};

      for (const p of winningPosts) {
        winCategories[p.category] = (winCategories[p.category] || 0) + 1;
        if (p.content_format) winFormats[p.content_format] = (winFormats[p.content_format] || 0) + 1;
        (p.keywords || []).forEach((k: string) => { winKeywords[k] = (winKeywords[k] || 0) + 1; });
      }

      const topCategories = Object.entries(winCategories).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);
      const topFormats = Object.entries(winFormats).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);
      const topKeywords = Object.entries(winKeywords).sort((a, b) => b[1] - a[1]).slice(0, 10).map(e => e[0]);

      const winInsight = `High-performing articles cluster in categories: ${topCategories.join(', ')}. Top formats: ${topFormats.join(', ') || 'varied'}. Recurring keywords: ${topKeywords.join(', ')}.`;

      const { error: winErr } = await supabase
        .from('blog_learnings')
        .upsert({
          learning_type: 'winning_pattern',
          insight: winInsight,
          confidence: Math.min(0.95, winningPosts.length / posts.length + 0.3),
          source_posts: winningPosts.map((p: any) => p.id).slice(0, 20),
          is_active: true,
          applied_count: 0,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'learning_type' });

      if (!winErr) learningsInserted.push('winning_pattern');
    }

    // Extract losing patterns
    if (losingPosts.length > 0) {
      const loseCategories: Record<string, number> = {};
      const loseFormats: Record<string, number> = {};

      for (const p of losingPosts) {
        loseCategories[p.category] = (loseCategories[p.category] || 0) + 1;
        if (p.content_format) loseFormats[p.content_format] = (loseFormats[p.content_format] || 0) + 1;
      }

      const bottomCategories = Object.entries(loseCategories).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);
      const bottomFormats = Object.entries(loseFormats).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);

      const loseInsight = `Underperforming articles cluster in categories: ${bottomCategories.join(', ')}. Weak formats: ${bottomFormats.join(', ') || 'varied'}. Consider different angles or keywords for these topics.`;

      const { error: loseErr } = await supabase
        .from('blog_learnings')
        .upsert({
          learning_type: 'underperforming',
          insight: loseInsight,
          confidence: Math.min(0.9, losingPosts.length / posts.length + 0.2),
          source_posts: losingPosts.map((p: any) => p.id).slice(0, 20),
          is_active: true,
          applied_count: 0,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'learning_type' });

      if (!loseErr) learningsInserted.push('underperforming');
    }

    return new Response(JSON.stringify({
      analyzed: results.length,
      results,
      learnings: learningsInserted,
    }), {
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
