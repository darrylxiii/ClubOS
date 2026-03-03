import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const authorMap: Record<string, string> = {
  'tqc-editorial': 'TQC Editorial Team',
  'alexandra-chen': 'Alexandra Chen',
  'marcus-williams': 'Marcus Williams',
  'alex-mercer': 'Alex Mercer',
  'sarah-jenkins': 'Sarah Jenkins',
};
function mapAuthorName(authorId: string | null): string {
  if (!authorId) return 'TQC Editorial Team';
  return authorMap[authorId] || authorId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

const categoryNames: Record<string, string> = {
  'career-insights': 'Career Insights',
  'talent-strategy': 'Talent Strategy',
  'industry-trends': 'Industry Trends',
  'leadership': 'Leadership',
};
function getCategoryName(slug: string): string {
  return categoryNames[slug] || slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

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
      return new Response('Not found', { status: 404 });
    }

    const baseUrl = 'https://os.thequantumclub.com';
    const postUrl = `${baseUrl}/blog/${category}/${slug}`;
    const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const heroImage = post.hero_image as { url?: string; alt?: string } | null;
    const isPlaceholder = !heroImage?.url || heroImage.url === '/placeholder.svg';
    const heroUrl = isPlaceholder
      ? `${baseUrl}/og-image.gif`
      : (heroImage!.url!.startsWith('http') ? heroImage!.url! : `${baseUrl}${heroImage!.url}`);
    const imgWidth = isPlaceholder ? 432 : 1200;
    const imgHeight = isPlaceholder ? 540 : 630;

    const content = post.content as Array<{ type: string; content?: string; level?: number; items?: string[]; caption?: string }> | null;
    const keywords = (post.keywords as string[] | null) || [];
    const faqSchema = (post as any).faq_schema || [];
    const keyTakeaways = (post.key_takeaways as string[] | null) || [];
    const authorName = mapAuthorName(post.author_id);

    // Calculate read time
    let wordCount = 0;
    for (const block of (content || [])) {
      if (block.content) wordCount += block.content.split(/\s+/).filter(Boolean).length;
      if (block.items) for (const item of block.items) wordCount += item.split(/\s+/).filter(Boolean).length;
    }
    const readTime = Math.max(1, Math.ceil(wordCount / 200));

    // Build semantic article HTML
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

    // Key takeaways
    let takeawaysHtml = '';
    if (keyTakeaways.length > 0) {
      takeawaysHtml = `<section id="key-takeaways"><h2>Key Takeaways</h2><ul>${keyTakeaways.map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ul></section>`;
    }

    // FAQ section (visible for crawlers)
    let faqHtml = '';
    if (faqSchema.length > 0) {
      faqHtml = `<section id="faq"><h2>Frequently Asked Questions</h2>${faqSchema.map((f: any) => `<details open><summary>${escapeHtml(f.question)}</summary><p>${escapeHtml(f.answer)}</p></details>`).join('')}</section>`;
    }

    // JSON-LD schemas
    const blogPostingSchema = JSON.stringify({
      "@context": "https://schema.org", "@type": "BlogPosting",
      "mainEntityOfPage": { "@type": "WebPage", "@id": postUrl },
      "headline": post.title, "description": post.meta_description,
      "image": { "@type": "ImageObject", "url": heroUrl, "width": imgWidth, "height": imgHeight },
      "author": { "@type": "Person", "name": authorName, "url": `${baseUrl}/blog` },
      "publisher": {
        "@type": "Organization", "name": "The Quantum Club", "url": baseUrl,
        "logo": { "@type": "ImageObject", "url": `${baseUrl}/quantum-clover-icon.png` },
      },
      "datePublished": post.published_at, "dateModified": post.updated_at || post.published_at,
      "wordCount": wordCount,
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

    const twitterImage = isPlaceholder ? `${baseUrl}/og-image-twitter-v3.gif` : heroUrl;

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
  <meta property="og:image:width" content="${imgWidth}" />
  <meta property="og:image:height" content="${imgHeight}" />
  <meta property="og:locale" content="en_US" />

  <meta property="article:published_time" content="${post.published_at}" />
  <meta property="article:modified_time" content="${post.updated_at || post.published_at}" />
  <meta property="article:author" content="${escapeHtml(authorName)}" />
  <meta property="article:section" content="${escapeHtml(category)}" />
  ${keywords.slice(0, 6).map(k => `<meta property="article:tag" content="${escapeHtml(k)}" />`).join('\n  ')}

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@thequantumclub" />
  <meta name="twitter:title" content="${escapeHtml(post.meta_title || post.title)}" />
  <meta name="twitter:description" content="${escapeHtml(post.meta_description || post.excerpt || '')}" />
  <meta name="twitter:image" content="${twitterImage}" />
  <meta name="twitter:label1" content="Reading time" />
  <meta name="twitter:data1" content="${readTime} min read" />

  <script type="application/ld+json">${blogPostingSchema}</script>
  <script type="application/ld+json">${breadcrumbSchema}</script>
  ${faqSchemaHtml}
</head>
<body>
  <article>
    <header>
      <h1>${escapeHtml(post.title)}</h1>
      <p>${escapeHtml(post.excerpt || '')}</p>
      <p>By ${escapeHtml(authorName)} · ${readTime} min read</p>
      ${!isPlaceholder ? `<img src="${heroUrl}" alt="${escapeHtml(heroImage?.alt || post.title)}" width="${imgWidth}" height="${imgHeight}" />` : ''}
    </header>
    ${takeawaysHtml}
    ${articleHtml}
    ${faqHtml}
  </article>
  <footer>
    <p>&copy; ${new Date().getFullYear()} The Quantum Club. All rights reserved.</p>
    <nav>
      <a href="${baseUrl}/blog">Back to Blog</a> |
      <a href="${baseUrl}">Home</a>
    </nav>
  </footer>
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
