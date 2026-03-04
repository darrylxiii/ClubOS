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
      totalPostsResult,
      subscribersResult,
      draftPostsResult,
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
        .select('id, topic, locked_at')
        .eq('status', 'generating'),

      supabase
        .from('blog_posts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published'),

      supabase
        .from('blog_subscribers')
        .select('id', { count: 'exact', head: true })
        .is('unsubscribed_at', null),

      supabase
        .from('blog_posts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'draft'),
    ]);

    // Detailed post checks for SEO validation
    const { data: allPosts } = await supabase
      .from('blog_posts')
      .select('id, slug, meta_title, meta_description, hero_image, faq_schema, key_takeaways, keywords')
      .eq('status', 'published');

    const posts = allPosts || [];
    const longTitles = posts.filter((p: any) => (p.meta_title || '').length > 55);
    const longDescs = posts.filter((p: any) => (p.meta_description || '').length > 155);
    
    // Fix: use text-based check for placeholder images
    const placeholderPosts = posts.filter((p: any) => {
      const heroImage = p.hero_image;
      if (!heroImage) return true;
      if (typeof heroImage === 'string') return heroImage.includes('placeholder.svg');
      return heroImage.url === '/placeholder.svg';
    });
    const missingImages = placeholderPosts.length;

    // Structured data validation
    const missingFaq = posts.filter((p: any) => !p.faq_schema || (Array.isArray(p.faq_schema) && p.faq_schema.length === 0));
    const missingTakeaways = posts.filter((p: any) => !p.key_takeaways || (Array.isArray(p.key_takeaways) && p.key_takeaways.length === 0));
    const fewKeywords = posts.filter((p: any) => !p.keywords || (Array.isArray(p.keywords) && p.keywords.length < 3));

    const stuckItems = stuckQueueResult.data || [];
    const issues: string[] = [];
    const totalPosts = totalPostsResult.count || 0;

    if ((pageViewsResult.count || 0) === 0) {
      issues.push('No page views recorded in last 24h — analytics pipeline may be down');
    }

    if ((analyticsResult.count || 0) === 0 && totalPosts > 0) {
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

    if (missingFaq.length > 0) {
      issues.push(`${missingFaq.length} post(s) missing FAQ schema`);
    }

    if (missingTakeaways.length > 0) {
      issues.push(`${missingTakeaways.length} post(s) missing key takeaways`);
    }

    if (fewKeywords.length > 0) {
      issues.push(`${fewKeywords.length} post(s) have fewer than 3 keywords`);
    }

    const maxPosts = Math.max(1, totalPosts);
    const seoScore = Math.round(
      100
      - (longTitles.length / maxPosts) * 15
      - (longDescs.length / maxPosts) * 15
      - (missingImages / maxPosts) * 25
      - (missingFaq.length / maxPosts) * 10
      - (missingTakeaways.length / maxPosts) * 10
      - (fewKeywords.length / maxPosts) * 5
      - (stuckItems.length > 0 ? 10 : 0)
    );

    const health = {
      status: issues.length === 0 ? 'healthy' : issues.length <= 2 ? 'degraded' : 'critical',
      checkedAt: now.toISOString(),
      seoScore: Math.max(0, Math.min(100, seoScore)),
      metrics: {
        pageViewsLast24h: pageViewsResult.count || 0,
        analyticsUpdatedLast24h: analyticsResult.count || 0,
        totalPublishedPosts: totalPosts,
        postsWithPlaceholderImages: missingImages,
        postsWithLongMetaTitle: longTitles.length,
        postsWithLongMetaDesc: longDescs.length,
        postsWithoutFaqSchema: missingFaq.length,
        postsWithoutKeyTakeaways: missingTakeaways.length,
        postsWithFewKeywords: fewKeywords.length,
        stuckQueueItems: stuckItems.length,
        activeSubscribers: subscribersResult.count || 0,
      },
      issues,
      stuckItems: stuckItems.map((i: any) => ({
        id: i.id,
        topic: i.topic,
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
