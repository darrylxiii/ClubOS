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

    // Find posts scheduled for publishing
    const now = new Date().toISOString();
    const { data: scheduledPosts, error } = await supabase
      .from('blog_posts')
      .select('id, title, slug')
      .eq('status', 'scheduled')
      .lte('published_at', now);

    if (error) throw error;

    if (!scheduledPosts?.length) {
      return new Response(JSON.stringify({ message: 'No posts to publish', published: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const published = [];
    for (const post of scheduledPosts) {
      await supabase
        .from('blog_posts')
        .update({ status: 'published' })
        .eq('id', post.id);
      published.push(post.slug);
    }

    return new Response(JSON.stringify({ published: published.length, slugs: published }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Blog scheduler error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
