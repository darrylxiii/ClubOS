import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async () => {
  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const baseUrl = 'https://os.thequantumclub.com';

    const { data: posts } = await supabase
      .from('blog_posts')
      .select('slug, title, excerpt, category, published_at, hero_image')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(50);

    const escapeXml = (str: string) =>
      str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

    const now = new Date().toUTCString();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>The Quantum Club — Insights</title>
    <link>${baseUrl}/blog</link>
    <description>Career insights, talent strategy, and leadership perspectives for senior professionals.</description>
    <language>en</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${Deno.env.get('SUPABASE_URL')}/functions/v1/blog-rss" rel="self" type="application/rss+xml" />`;

    for (const post of (posts || [])) {
      const heroImage = post.hero_image as { url?: string } | null;
      const imageUrl = heroImage?.url && heroImage.url !== '/placeholder.svg'
        ? (heroImage.url.startsWith('http') ? heroImage.url : `${baseUrl}${heroImage.url}`)
        : '';

      xml += `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${baseUrl}/blog/${post.category}/${post.slug}</link>
      <guid isPermaLink="true">${baseUrl}/blog/${post.category}/${post.slug}</guid>
      <description>${escapeXml(post.excerpt || '')}</description>
      <pubDate>${new Date(post.published_at).toUTCString()}</pubDate>
      <category>${escapeXml(post.category)}</category>${imageUrl ? `
      <enclosure url="${escapeXml(imageUrl)}" type="image/jpeg" length="0" />` : ''}
    </item>`;
    }

    xml += `
  </channel>
</rss>`;

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('RSS feed error:', error);
    return new Response('Error generating RSS feed', { status: 500 });
  }
});
