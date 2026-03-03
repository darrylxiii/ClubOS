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
    ] = await Promise.all([
      // Page views in last 24h
      supabase
        .from('blog_page_views')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', last24h),

      // Analytics aggregated in last 24h
      supabase
        .from('blog_analytics')
        .select('id', { count: 'exact', head: true })
        .gte('updated_at', last24h),

      // Queue items stuck in 'generating'
      supabase
        .from('blog_generation_queue')
        .select('id, title, locked_at')
        .eq('status', 'generating'),

      // Posts with placeholder images
      supabase
        .from('blog_posts')
        .select('id, title, slug', { count: 'exact' })
        .eq('status', 'published')
        .eq('hero_image', JSON.stringify({ url: '/placeholder.svg', alt: '' })),

      // Total published posts
      supabase
        .from('blog_posts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published'),

      // Total subscribers
      supabase
        .from('blog_subscribers')
        .select('id', { count: 'exact', head: true })
        .is('unsubscribed_at', null),
    ]);

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

    const health = {
      status: issues.length === 0 ? 'healthy' : 'degraded',
      checkedAt: now.toISOString(),
      metrics: {
        pageViewsLast24h: pageViewsResult.count || 0,
        analyticsUpdatedLast24h: analyticsResult.count || 0,
        totalPublishedPosts: totalPostsResult.count || 0,
        postsWithPlaceholderImages: placeholderResult.count || 0,
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
