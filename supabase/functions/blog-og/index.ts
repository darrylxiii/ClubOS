import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const category = url.searchParams.get('category');
    const slug = url.searchParams.get('slug');

    if (!category || !slug) {
      return new Response('Missing category or slug', { status: 400 });
    }

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: post, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('category', category)
      .eq('status', 'published')
      .single();

    if (error || !post) {
      // Fall through to SPA for non-existent posts
      return new Response('Not found', { status: 404 });
    }

    const baseUrl = 'https://os.thequantumclub.com';
    const postUrl = `${baseUrl}/blog/${category}/${slug}`;
    const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const heroImage = post.hero_image as { url?: string; alt?: string } | null;
    const heroUrl = heroImage?.url && heroImage.url !== '/placeholder.svg'
      ? (heroImage.url.startsWith('http') ? heroImage.url : `${baseUrl}${heroImage.url}`)
      : `${baseUrl}/og-image.gif`;

    const content = post.content as Array<{ type: string; content?: string; level?: number; items?: string[]; caption?: string }> | null;
    const keywords = (post.keywords as string[] | null) || [];
    const faqSchema = (post as any).faq_schema || [];
    const keyTakeaways = (post.key_takeaways as string[] | null) || [];

    // Build semantic article HTML from content blocks
    let articleHtml = '';
    for (const block of (content || [])) {
      const text = escapeHtml(block.content || '');
      switch (block.type) {
        case 'heading':
          const tag = block.level === 3 ? 'h3' : 'h2';
          articleHtml += `<${tag}>${text}</${tag}>\n`;
          break;
        case 'paragraph':
          articleHtml += `<p>${text}</p>\n`;
          break;
        case 'quote':
          articleHtml += `<blockquote><p>${text}</p>${block.caption ? `<footer>${escapeHtml(block.caption)}</footer>` : ''}</blockquote>\n`;
          break;
        case 'list':
          if (text) articleHtml += `<p>${text}</p>\n`;
          articleHtml += '<ul>\n';
          for (const item of (block.items || [])) {
            articleHtml += `<li>${escapeHtml(item)}</li>\n`;
          }
          articleHtml += '</ul>\n';
          break;
        case 'callout':
          articleHtml += `<aside><p>${text}</p></aside>\n`;
          break;
      }
    }

    // Key takeaways section
    let takeawaysHtml = '';
    if (keyTakeaways.length > 0) {
      takeawaysHtml = `<section id="key-takeaways"><h2>Key Takeaways</h2><ul>${keyTakeaways.map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ul></section>`;
    }

    // JSON-LD schemas
    const blogPostingSchema = JSON.stringify({
      "@context": "https://schema.org", "@type": "BlogPosting",
      "mainEntityOfPage": { "@type": "WebPage", "@id": postUrl },
      "headline": post.title, "description": post.meta_description,
      "image": { "@type": "ImageObject", "url": heroUrl, "width": 1200, "height": 630 },
      "author": { "@type": "Person", "name": post.author_id || "TQC Editorial", "url": `${baseUrl}/blog` },
      "publisher": {
        "@type": "Organization", "name": "The Quantum Club", "url": baseUrl,
        "logo": { "@type": "ImageObject", "url": `${baseUrl}/quantum-clover-icon.png` },
      },
      "datePublished": post.published_at, "dateModified": post.updated_at || post.published_at,
      "articleSection": category, "keywords": keywords.join(', '),
      "inLanguage": "en", "isAccessibleForFree": true,
      "speakable": { "@type": "SpeakableSpecification", "cssSelector": ["#key-takeaways", "h1"] },
    });

    const breadcrumbSchema = JSON.stringify({
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": baseUrl },
        { "@type": "ListItem", "position": 2, "name": "Blog", "item": `${baseUrl}/blog` },
        { "@type": "ListItem", "position": 3, "name": category, "item": `${baseUrl}/blog/${category}` },
        { "@type": "ListItem", "position": 4, "name": post.title },
      ],
    });

    let faqSchemaHtml = '';
    if (faqSchema.length > 0) {
      faqSchemaHtml = `<script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org", "@type": "FAQPage",
        "mainEntity": faqSchema.map((f: any) => ({
          "@type": "Question", "name": f.question,
          "acceptedAnswer": { "@type": "Answer", "text": f.answer },
        })),
      })}</script>`;
    }

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(post.meta_title || post.title)}</title>
  <meta name="description" content="${escapeHtml(post.meta_description || post.excerpt || '')}" />
  <link rel="canonical" href="${postUrl}" />

  <meta property="og:title" content="${escapeHtml(post.meta_title || post.title)}" />
  <meta property="og:description" content="${escapeHtml(post.meta_description || post.excerpt || '')}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${postUrl}" />
  <meta property="og:site_name" content="The Quantum Club" />
  <meta property="og:image" content="${heroUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:locale" content="en_US" />

  <meta property="article:published_time" content="${post.published_at}" />
  <meta property="article:modified_time" content="${post.updated_at || post.published_at}" />
  <meta property="article:author" content="${escapeHtml(post.author_id || 'TQC Editorial')}" />
  <meta property="article:section" content="${escapeHtml(category)}" />
  ${keywords.slice(0, 6).map(k => `<meta property="article:tag" content="${escapeHtml(k)}" />`).join('\n  ')}

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@thequantumclub" />
  <meta name="twitter:title" content="${escapeHtml(post.meta_title || post.title)}" />
  <meta name="twitter:description" content="${escapeHtml(post.meta_description || post.excerpt || '')}" />
  <meta name="twitter:image" content="${heroUrl}" />

  <script type="application/ld+json">${blogPostingSchema}</script>
  <script type="application/ld+json">${breadcrumbSchema}</script>
  ${faqSchemaHtml}
</head>
<body>
  <article>
    <header>
      <h1>${escapeHtml(post.title)}</h1>
      <p>${escapeHtml(post.excerpt || '')}</p>
      ${heroUrl !== `${baseUrl}/og-image.gif` ? `<img src="${heroUrl}" alt="${escapeHtml(heroImage?.alt || post.title)}" width="1200" height="630" />` : ''}
    </header>
    ${takeawaysHtml}
    ${articleHtml}
  </article>
  <footer>
    <p>&copy; ${new Date().getFullYear()} The Quantum Club. All rights reserved.</p>
    <nav>
      <a href="${baseUrl}/blog">Back to Blog</a> |
      <a href="${baseUrl}">Home</a>
    </nav>
  </footer>

  <!-- This page is served for crawlers and social preview validators -->
  <!-- Interactive users access articles via the SPA at the canonical URL -->
</body>
</html>`;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        'X-Robots-Tag': 'index, follow',
      },
    });
  } catch (error) {
    console.error('Blog OG render error:', error);
    return new Response('Error rendering article', { status: 500 });
  }
});
