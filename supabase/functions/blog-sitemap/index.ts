import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const baseUrl = 'https://os.thequantumclub.com';
    const categories = ['career-insights', 'talent-strategy', 'industry-trends', 'leadership'];

    const { data: posts } = await supabase
      .from('blog_posts')
      .select('slug, category, updated_at, published_at, hero_image')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    // Compute ETag from latest updated_at
    const allDates = (posts || []).map((p: any) => p.updated_at || p.published_at || '');
    const latestDate = allDates.sort().reverse()[0] || '';
    const etag = `"sitemap-${latestDate}"`;

    const ifNoneMatch = req.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new Response(null, { status: 304 });
    }

    // Category lastmod
    const categoryLastmod: Record<string, string> = {};
    for (const post of (posts || [])) {
      const cat = post.category;
      const date = (post.updated_at || post.published_at || '').split('T')[0];
      if (!categoryLastmod[cat] || date > categoryLastmod[cat]) {
        categoryLastmod[cat] = date;
      }
    }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
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

    for (const cat of categories) {
      const lastmod = categoryLastmod[cat] ? `\n    <lastmod>${categoryLastmod[cat]}</lastmod>` : '';
      xml += `
  <url>
    <loc>${baseUrl}/blog/${cat}</loc>${lastmod}
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
    }

    const escapeXml = (str: string) =>
      str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

    for (const post of (posts || [])) {
      const lastmod = (post.updated_at || post.published_at || '').split('T')[0];
      const heroImage = post.hero_image as { url?: string; alt?: string } | null;
      const hasRealImage = heroImage?.url && heroImage.url !== '/placeholder.svg';
      const imageUrl = hasRealImage
        ? (heroImage!.url!.startsWith('http') ? heroImage!.url! : `${baseUrl}${heroImage!.url}`)
        : null;

      xml += `
  <url>
    <loc>${baseUrl}/blog/${post.category}/${post.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>${imageUrl ? `
    <image:image>
      <image:loc>${escapeXml(imageUrl)}</image:loc>
      <image:caption>${escapeXml(heroImage?.alt || '')}</image:caption>
    </image:image>` : ''}
  </url>`;
    }

    xml += '\n</urlset>';

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        'ETag': etag,
      },
    });
  } catch (error) {
    console.error('Sitemap error:', error);
    return new Response('Error generating sitemap', { status: 500 });
  }
});
