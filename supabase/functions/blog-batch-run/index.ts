import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

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

    // Check engine settings
    const { data: settings } = await supabase
      .from('blog_engine_settings')
      .select('*')
      .limit(1)
      .single();

    if (!settings?.is_active) {
      return new Response(JSON.stringify({ message: 'Engine is paused' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const postsPerDay = settings.posts_per_day || 30;

    // Count today's generated posts
    const today = new Date().toISOString().split('T')[0];
    const { count: todayCount } = await supabase
      .from('blog_posts')
      .select('*', { count: 'exact', head: true })
      .eq('ai_generated', true)
      .gte('created_at', `${today}T00:00:00`);

    const remaining = postsPerDay - (todayCount || 0);
    if (remaining <= 0) {
      return new Response(JSON.stringify({ message: 'Daily limit reached', generated: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process up to 5 posts per batch invocation (to stay within function timeout)
    const batchSize = Math.min(remaining, 5);
    const results: { slug: string; success: boolean; error?: string }[] = [];
    let retryDelay = 3000;

    for (let i = 0; i < batchSize; i++) {
      // Check queue depth
      const { count: queueCount } = await supabase
        .from('blog_generation_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Refill queue if low
      if ((queueCount || 0) < 5) {
        const suggestUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/blog-suggest`;
        await fetch(suggestUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({ autoQueue: true }),
        });
        await sleep(2000); // Let suggestions settle
      }

      // Get next queue item
      const { data: queueItem } = await supabase
        .from('blog_generation_queue')
        .select('*')
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (!queueItem) {
        results.push({ slug: '', success: false, error: 'Queue empty after refill' });
        break;
      }

      // Generate article
      const generateUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/blog-generate`;
      const genResponse = await fetch(generateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          queueId: queueItem.id,
          topic: queueItem.topic,
          category: queueItem.category,
          targetKeywords: queueItem.target_keywords,
          contentFormat: queueItem.content_format,
        }),
      });

      if (genResponse.status === 429) {
        // Rate limited — exponential backoff
        console.log(`Rate limited, waiting ${retryDelay}ms...`);
        await sleep(retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30000);
        results.push({ slug: queueItem.topic, success: false, error: 'rate_limited' });
        continue;
      }

      if (genResponse.status === 402) {
        results.push({ slug: '', success: false, error: 'credits_exhausted' });
        break;
      }

      const result = await genResponse.json();

      if (result.success && result.postId) {
        // Auto-publish if setting is on
        if (settings.auto_publish && !settings.require_medical_review) {
          await supabase
            .from('blog_posts')
            .update({ status: 'published', published_at: new Date().toISOString() })
            .eq('id', result.postId);
        }
        results.push({ slug: result.slug, success: true });
      } else {
        results.push({ slug: queueItem.topic, success: false, error: result.error });
      }

      // Delay between generations to avoid rate limits
      if (i < batchSize - 1) {
        await sleep(retryDelay);
      }
    }

    const successCount = results.filter(r => r.success).length;

    return new Response(JSON.stringify({
      message: `Batch complete: ${successCount}/${results.length} generated`,
      results,
      todayTotal: (todayCount || 0) + successCount,
      dailyLimit: postsPerDay,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Blog batch run error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
