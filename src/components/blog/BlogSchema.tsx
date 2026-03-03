import { Helmet } from 'react-helmet-async';
import { BlogPost, BlogCategory } from '@/data/blog';

interface BlogSchemaProps { post: BlogPost; categoryData?: BlogCategory; }

const BlogSchema: React.FC<BlogSchemaProps> = ({ post, categoryData }) => {
  const baseUrl = 'https://os.thequantumclub.com';
  const postUrl = `${baseUrl}/blog/${post.category}/${post.slug}`;
  const wordCount = post.content.reduce((c, b) => c + (b.content + (b.items?.join(' ') || '')).split(/\s+/).filter(Boolean).length, 0);

  const heroImageUrl = post.heroImage.url.startsWith('http') ? post.heroImage.url : `${baseUrl}${post.heroImage.url}`;
  const fallbackOgImage = `${baseUrl}/og-image.gif`;
  const isPlaceholder = !heroImageUrl || heroImageUrl === `${baseUrl}/placeholder.svg`;
  const ogImage = isPlaceholder ? fallbackOgImage : heroImageUrl;
  const ogImageWidth = isPlaceholder ? 432 : 1200;
  const ogImageHeight = isPlaceholder ? 540 : 630;

  const blogPostingSchema = {
    "@context": "https://schema.org", "@type": "BlogPosting",
    "mainEntityOfPage": { "@type": "WebPage", "@id": postUrl },
    "headline": post.title, "description": post.metaDescription,
    "image": { "@type": "ImageObject", "url": ogImage, "width": 1200, "height": 630 },
    "author": {
      "@type": "Person",
      "name": post.author.name,
      "jobTitle": post.author.credentials,
      "url": `${baseUrl}/blog`,
    },
    "publisher": {
      "@type": "Organization",
      "name": "The Quantum Club",
      "url": baseUrl,
      "logo": { "@type": "ImageObject", "url": `${baseUrl}/quantum-clover-icon.png` },
      "sameAs": [
        "https://www.linkedin.com/company/thequantumclub",
        "https://x.com/thequantumclub",
      ],
    },
    "datePublished": post.publishedAt,
    "dateModified": post.updatedAt || post.publishedAt,
    "wordCount": wordCount,
    "articleSection": categoryData?.name || post.category,
    "keywords": post.keywords.join(', '),
    "inLanguage": "en",
    "isAccessibleForFree": true,
    "speakable": {
      "@type": "SpeakableSpecification",
      "cssSelector": ["#key-takeaways", "h1"],
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": baseUrl },
      { "@type": "ListItem", "position": 2, "name": "Blog", "item": `${baseUrl}/blog` },
      ...(categoryData ? [{ "@type": "ListItem", "position": 3, "name": categoryData.name, "item": `${baseUrl}/blog/${post.category}` }] : []),
      { "@type": "ListItem", "position": categoryData ? 4 : 3, "name": post.title },
    ],
  };

  // FAQ Schema from post data
  const faqItems = (post as any).faqSchema || [];
  const faqSchema = faqItems.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqItems.map((faq: { question: string; answer: string }) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer,
      },
    })),
  } : null;

  return (
    <Helmet>
      <link rel="canonical" href={postUrl} />

      {/* OpenGraph Article Tags */}
      <meta property="og:title" content={post.metaTitle} />
      <meta property="og:description" content={post.metaDescription} />
      <meta property="og:type" content="article" />
      <meta property="og:url" content={postUrl} />
      <meta property="og:site_name" content="The Quantum Club" />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="en_US" />

      {/* Article-specific OG tags */}
      <meta property="article:published_time" content={post.publishedAt} />
      <meta property="article:modified_time" content={post.updatedAt || post.publishedAt} />
      <meta property="article:author" content={post.author.name} />
      <meta property="article:section" content={categoryData?.name || post.category} />
      {post.keywords.slice(0, 6).map((keyword, i) => (
        <meta key={`tag-${i}`} property="article:tag" content={keyword} />
      ))}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@thequantumclub" />
      <meta name="twitter:title" content={post.metaTitle} />
      <meta name="twitter:description" content={post.metaDescription} />
      <meta name="twitter:image" content={ogImage.includes('og-image.gif') ? ogImage.replace('og-image.gif', 'og-image-twitter-v3.gif') : ogImage} />

      {/* JSON-LD Schemas */}
      <script type="application/ld+json">{JSON.stringify(blogPostingSchema)}</script>
      <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      {faqSchema && <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>}
    </Helmet>
  );
};

export default BlogSchema;
