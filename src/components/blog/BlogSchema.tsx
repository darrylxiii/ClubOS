import { Helmet } from 'react-helmet-async';
import { BlogPost, BlogCategory } from '@/data/blog';

interface BlogSchemaProps { post: BlogPost; categoryData?: BlogCategory; }

const BlogSchema: React.FC<BlogSchemaProps> = ({ post, categoryData }) => {
  const baseUrl = 'https://os.thequantumclub.com';
  const postUrl = `${baseUrl}/blog/${post.category}/${post.slug}`;
  const wordCount = post.content.reduce((c, b) => c + (b.content + (b.items?.join(' ') || '')).split(/\s+/).filter(Boolean).length, 0);

  const blogPostingSchema = {
    "@context": "https://schema.org", "@type": "BlogPosting",
    "mainEntityOfPage": { "@type": "WebPage", "@id": postUrl },
    "headline": post.title, "description": post.metaDescription,
    "image": { "@type": "ImageObject", "url": post.heroImage.url.startsWith('http') ? post.heroImage.url : `${baseUrl}${post.heroImage.url}` },
    "author": { "@type": "Person", "name": post.author.name, "jobTitle": post.author.credentials },
    "publisher": { "@type": "Organization", "name": "The Quantum Club", "logo": { "@type": "ImageObject", "url": `${baseUrl}/quantum-clover-icon.png` } },
    "datePublished": post.publishedAt, "dateModified": post.updatedAt, "wordCount": wordCount,
    "articleSection": categoryData?.name || post.category, "keywords": post.keywords.join(', '),
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

  // FAQ Schema from post data (for AI-generated posts with faq_schema)
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

  const heroImageUrl = post.heroImage.url.startsWith('http') ? post.heroImage.url : `${baseUrl}${post.heroImage.url}`;
  const fallbackOgImage = `${baseUrl}/og-image.gif`;
  const ogImage = heroImageUrl && heroImageUrl !== `${baseUrl}/placeholder.svg` ? heroImageUrl : fallbackOgImage;

  return (
    <Helmet>
      <link rel="canonical" href={postUrl} />
      <meta property="og:title" content={post.metaTitle} />
      <meta property="og:description" content={post.metaDescription} />
      <meta property="og:type" content="article" />
      <meta property="og:url" content={postUrl} />
      <meta property="og:site_name" content="The Quantum Club" />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@thequantumclub" />
      <meta name="twitter:title" content={post.metaTitle} />
      <meta name="twitter:description" content={post.metaDescription} />
      <meta name="twitter:image" content={ogImage.replace('og-image.gif', 'og-image-twitter.gif')} />
      <script type="application/ld+json">{JSON.stringify(blogPostingSchema)}</script>
      <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      {faqSchema && <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>}
    </Helmet>
  );
};

export default BlogSchema;
