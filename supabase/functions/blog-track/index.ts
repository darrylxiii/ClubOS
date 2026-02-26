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
    const { postSlug, eventType, eventData, anonymousId, sessionId } = await req.json();

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    if (eventType === 'page_view') {
      await supabase.from('blog_page_views').insert({
        post_slug: postSlug,
        anonymous_id: anonymousId,
        session_id: sessionId,
        referrer: eventData?.referrer || null,
        user_agent: eventData?.userAgent || null,
        utm_source: eventData?.utmSource || null,
        utm_medium: eventData?.utmMedium || null,
        utm_campaign: eventData?.utmCampaign || null,
      });
    }

    if (eventType === 'scroll_depth' || eventType === 'cta_click' || eventType === 'exit') {
      // Update analytics aggregates
      const today = new Date().toISOString().split('T')[0];

      const { data: existing } = await supabase
        .from('blog_analytics')
        .select('*')
        .eq('post_slug', postSlug)
        .eq('date', today)
        .single();

      if (existing) {
        const updates: Record<string, any> = {};
        if (eventType === 'scroll_depth') {
          const maxScroll = Math.max(existing.avg_scroll_depth || 0, eventData?.depth || 0);
          updates.avg_scroll_depth = maxScroll;
          if (eventData?.depth >= 75) updates.completions = (existing.completions || 0) + 1;
        }
        if (eventType === 'cta_click') {
          updates.cta_clicks = (existing.cta_clicks || 0) + 1;
        }

        await supabase
          .from('blog_analytics')
          .update(updates)
          .eq('id', existing.id);
      } else {
        await supabase.from('blog_analytics').insert({
          post_slug: postSlug,
          date: today,
          views: eventType === 'page_view' ? 1 : 0,
          avg_scroll_depth: eventType === 'scroll_depth' ? (eventData?.depth || 0) : 0,
          cta_clicks: eventType === 'cta_click' ? 1 : 0,
          completions: 0,
        });
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
