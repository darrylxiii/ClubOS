import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const baseUrl = 'https://thequantumclub.lovable.app';
    const categories = ['career-insights', 'talent-strategy', 'industry-trends', 'leadership'];

    // Fetch all published posts
    const { data: posts } = await supabase
      .from('blog_posts')
      .select('slug, category, updated_at, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/blog</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;

    // Category pages
    for (const cat of categories) {
      xml += `
  <url>
    <loc>${baseUrl}/blog/${cat}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
    }

    // Individual posts
    for (const post of (posts || [])) {
      const lastmod = (post.updated_at || post.published_at || '').split('T')[0];
      xml += `
  <url>
    <loc>${baseUrl}/blog/${post.category}/${post.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    }

    xml += '\n</urlset>';

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Sitemap error:', error);
    return new Response('Error generating sitemap', { status: 500 });
  }
});
