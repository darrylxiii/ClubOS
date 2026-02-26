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

    // Find stale posts (published > 90 days ago, low performance)
    const staleDate = new Date(Date.now() - 90 * 86400000).toISOString();
    const { data: stalePosts } = await supabase
      .from('blog_posts')
      .select('id, slug, title, category, performance_score, published_at')
      .eq('status', 'published')
      .lt('published_at', staleDate)
      .lt('performance_score', 30)
      .order('performance_score', { ascending: true })
      .limit(10);

    return new Response(JSON.stringify({
      staleCount: stalePosts?.length || 0,
      posts: stalePosts || [],
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Blog refresh error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
