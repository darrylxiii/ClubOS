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

    // Step 0: Release stuck queue items
    await supabase.rpc('release_stuck_queue_items');

    // Check if engine is active
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

    // Count today's generated posts
    const today = new Date().toISOString().split('T')[0];
    const { count } = await supabase
      .from('blog_posts')
      .select('*', { count: 'exact', head: true })
      .eq('ai_generated', true)
      .gte('created_at', `${today}T00:00:00`);

    if ((count || 0) >= (settings.posts_per_day || 1)) {
      return new Response(JSON.stringify({ message: 'Daily limit reached' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Atomic claim: use DB function instead of SELECT then UPDATE
    const { data: claimedItems } = await supabase.rpc('claim_blog_queue_item');
    const queueItem = claimedItems?.[0];

    if (!queueItem) {
      // Auto-suggest if queue empty
      const suggestUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/blog-suggest`;
      await fetch(suggestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({ autoQueue: true }),
      });

      return new Response(JSON.stringify({ message: 'Queue was empty, suggestions added' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate article (item already claimed as 'generating')
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

    const result = await genResponse.json();

    // Auto-publish if setting is on and quality passes
    if (settings.auto_publish && !settings.require_medical_review && result.postId) {
      await supabase
        .from('blog_posts')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('id', result.postId);
    }

    return new Response(JSON.stringify({ ...result, autoPublished: settings.auto_publish }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Blog engine run error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
