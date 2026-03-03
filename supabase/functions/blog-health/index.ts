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

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    // Run all checks in parallel
    const [
      pageViewsResult,
      analyticsResult,
      stuckQueueResult,
      placeholderResult,
      totalPostsResult,
      subscribersResult,
      metaTitleResult,
      metaDescResult,
    ] = await Promise.all([
      supabase
        .from('blog_page_views')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', last24h),

      supabase
        .from('blog_analytics')
        .select('id', { count: 'exact', head: true })
        .gte('updated_at', last24h),

      supabase
        .from('blog_generation_queue')
        .select('id, title, locked_at')
        .eq('status', 'generating'),

      supabase
        .from('blog_posts')
        .select('id, title, slug', { count: 'exact' })
        .eq('status', 'published')
        .like('hero_image::text', '%placeholder.svg%'),

      supabase
        .from('blog_posts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published'),

      supabase
        .from('blog_subscribers')
        .select('id', { count: 'exact', head: true })
        .is('unsubscribed_at', null),

      // SEO: posts with meta_title > 55 chars
      supabase.rpc('exec_sql', { sql: "SELECT count(*) as cnt FROM blog_posts WHERE status = 'published' AND length(meta_title) > 55" }).then(() => null).catch(() => null),

      // SEO: posts with meta_description > 155 chars
      supabase.rpc('exec_sql', { sql: "SELECT count(*) as cnt FROM blog_posts WHERE status = 'published' AND length(meta_description) > 155" }).then(() => null).catch(() => null),
    ]);

    // Manual meta check since rpc may not exist
    const { data: metaIssues } = await supabase
      .from('blog_posts')
      .select('id, slug, meta_title, meta_description')
      .eq('status', 'published');

    const longTitles = (metaIssues || []).filter((p: any) => (p.meta_title || '').length > 55);
    const longDescs = (metaIssues || []).filter((p: any) => (p.meta_description || '').length > 155);
    const missingImages = placeholderResult.count || 0;

    const stuckItems = stuckQueueResult.data || [];
    const issues: string[] = [];

    if ((pageViewsResult.count || 0) === 0) {
      issues.push('No page views recorded in last 24h — analytics pipeline may be down');
    }

    if ((analyticsResult.count || 0) === 0 && (totalPostsResult.count || 0) > 0) {
      issues.push('No analytics aggregated in last 24h — blog-analyze may not be running');
    }

    if (stuckItems.length > 0) {
      issues.push(`${stuckItems.length} queue item(s) stuck in "generating" status`);
    }

    if (longTitles.length > 0) {
      issues.push(`${longTitles.length} post(s) have meta_title > 55 chars (SERP truncation)`);
    }

    if (longDescs.length > 0) {
      issues.push(`${longDescs.length} post(s) have meta_description > 155 chars (SERP truncation)`);
    }

    if (missingImages > 0) {
      issues.push(`${missingImages} post(s) still using placeholder hero images`);
    }

    const seoScore = Math.round(
      100
      - (longTitles.length / Math.max(1, totalPostsResult.count || 1)) * 20
      - (longDescs.length / Math.max(1, totalPostsResult.count || 1)) * 20
      - (missingImages / Math.max(1, totalPostsResult.count || 1)) * 30
      - (stuckItems.length > 0 ? 10 : 0)
    );

    const health = {
      status: issues.length === 0 ? 'healthy' : issues.length <= 2 ? 'degraded' : 'critical',
      checkedAt: now.toISOString(),
      seoScore: Math.max(0, Math.min(100, seoScore)),
      metrics: {
        pageViewsLast24h: pageViewsResult.count || 0,
        analyticsUpdatedLast24h: analyticsResult.count || 0,
        totalPublishedPosts: totalPostsResult.count || 0,
        postsWithPlaceholderImages: missingImages,
        postsWithLongMetaTitle: longTitles.length,
        postsWithLongMetaDesc: longDescs.length,
        stuckQueueItems: stuckItems.length,
        activeSubscribers: subscribersResult.count || 0,
      },
      issues,
      stuckItems: stuckItems.map((i: any) => ({
        id: i.id,
        title: i.title,
        lockedAt: i.locked_at,
      })),
    };

    return new Response(JSON.stringify(health), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Blog health check error:', error);
    return new Response(JSON.stringify({ status: 'error', error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
