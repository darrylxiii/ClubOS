import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Simple in-memory rate limiter (per edge function instance)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60; // requests per minute

function isRateLimited(anonymousId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(anonymousId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(anonymousId, { count: 1, resetAt: now + 60000 });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { postSlug, eventType, eventData, anonymousId, sessionId } = await req.json();

    if (!postSlug || !eventType) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limit check
    if (anonymousId && isRateLimited(anonymousId)) {
      return new Response(JSON.stringify({ error: 'Rate limited' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Handle page_view — insert into blog_page_views
    if (eventType === 'page_view') {
      await supabase.from('blog_page_views').insert({
        post_slug: postSlug,
        anonymous_id: anonymousId,
        session_id: sessionId,
        referrer: eventData?.referrer || null,
        user_agent: eventData?.userAgent || null,
        device_type: eventData?.deviceType || null,
      });

      // Also increment daily page_views aggregate
      const today = new Date().toISOString().split('T')[0];
      const { data: existing } = await supabase
        .from('blog_analytics')
        .select('id, page_views, unique_visitors')
        .eq('post_slug', postSlug)
        .eq('date', today)
        .single();

      if (existing) {
        await supabase.from('blog_analytics').update({
          page_views: (existing.page_views || 0) + 1,
        }).eq('id', existing.id);
      } else {
        await supabase.from('blog_analytics').insert({
          post_slug: postSlug,
          date: today,
          page_views: 1,
          unique_visitors: 1,
          scroll_depth: 0,
          cta_clicks: 0,
          bounce_rate: 0,
        });
      }
    }

    // Handle scroll_depth — update page view record and daily aggregate
    if (eventType === 'scroll_depth') {
      const depth = eventData?.depth || 0;

      // Update the page view record's max scroll
      if (sessionId) {
        await supabase.from('blog_page_views')
          .update({ max_scroll_depth: depth })
          .eq('session_id', sessionId)
          .eq('post_slug', postSlug);
      }

      // Update daily aggregate scroll depth (running max)
      const today = new Date().toISOString().split('T')[0];
      const { data: existing } = await supabase
        .from('blog_analytics')
        .select('id, scroll_depth')
        .eq('post_slug', postSlug)
        .eq('date', today)
        .single();

      if (existing) {
        const newDepth = Math.max(existing.scroll_depth || 0, depth);
        await supabase.from('blog_analytics').update({
          scroll_depth: newDepth,
        }).eq('id', existing.id);
      }
    }

    // Handle cta_click
    if (eventType === 'cta_click') {
      // Update page view record
      if (sessionId) {
        const { data: pv } = await supabase.from('blog_page_views')
          .select('cta_clicks')
          .eq('session_id', sessionId)
          .eq('post_slug', postSlug)
          .single();

        if (pv) {
          await supabase.from('blog_page_views')
            .update({ cta_clicks: (pv.cta_clicks || 0) + 1 })
            .eq('session_id', sessionId)
            .eq('post_slug', postSlug);
        }
      }

      // Update daily aggregate
      const today = new Date().toISOString().split('T')[0];
      const { data: existing } = await supabase
        .from('blog_analytics')
        .select('id, cta_clicks')
        .eq('post_slug', postSlug)
        .eq('date', today)
        .single();

      if (existing) {
        await supabase.from('blog_analytics').update({
          cta_clicks: (existing.cta_clicks || 0) + 1,
        }).eq('id', existing.id);
      }
    }

    // Handle time_update and exit — update time_on_page on the page view record
    if (eventType === 'time_update' || eventType === 'exit') {
      const timeOnPage = eventData?.timeOnPage || 0;

      if (sessionId) {
        await supabase.from('blog_page_views')
          .update({
            time_on_page: timeOnPage,
            ...(eventType === 'exit' ? {
              exited_at: new Date().toISOString(),
              max_scroll_depth: eventData?.scrollDepth || 0,
            } : {}),
          })
          .eq('session_id', sessionId)
          .eq('post_slug', postSlug);
      }

      // Update daily avg_time_on_page
      if (eventType === 'exit' && timeOnPage > 0) {
        const today = new Date().toISOString().split('T')[0];
        const { data: existing } = await supabase
          .from('blog_analytics')
          .select('id, avg_time_on_page, page_views')
          .eq('post_slug', postSlug)
          .eq('date', today)
          .single();

        if (existing) {
          // Running average
          const views = existing.page_views || 1;
          const currentAvg = existing.avg_time_on_page || 0;
          const newAvg = Math.round(((currentAvg * (views - 1)) + timeOnPage) / views);
          await supabase.from('blog_analytics').update({
            avg_time_on_page: newAvg,
          }).eq('id', existing.id);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Blog track error:', error);
    return new Response(JSON.stringify({ error: 'Tracking failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
