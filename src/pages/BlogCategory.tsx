import React from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import BlogGrid from '@/components/blog/BlogGrid';
import NewsletterCapture from '@/components/blog/NewsletterCapture';
import { Button } from '@/components/ui/button';
import { getCategoryBySlug } from '@/data/blog';
import { useDynamicBlogPostsByCategory } from '@/hooks/useDynamicBlogPosts';

const BlogCategory: React.FC = () => {
  const { t } = useTranslation('common');
  const { category } = useParams<{ category: string }>();
  const categoryData = category ? getCategoryBySlug(category) : undefined;
  const { data: posts, isLoading } = useDynamicBlogPostsByCategory(category || '');

  if (!categoryData) {
    return (
      <>
        <Helmet>
          <meta name="robots" content="noindex, nofollow" />
          <title>Category Not Found | The Quantum Club</title>
        </Helmet>
        <main className="flex-1 flex items-center justify-center pt-32">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-foreground mb-4">{t('blogCategory.title')}</h1>
            <p className="text-muted-foreground mb-6">{t('blogCategory.desc')}</p>
            <Link to="/blog">
              <Button className="rounded-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Insights
              </Button>
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{categoryData.name} | The Quantum Club Insights</title>
        <meta name="description" content={categoryData.description} />
        <link rel="canonical" href={`https://os.thequantumclub.com/blog/${category}`} />
        <meta property="og:title" content={`${categoryData.name} | The Quantum Club Insights`} />
        <meta property="og:description" content={categoryData.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://os.thequantumclub.com/blog/${category}`} />
        <meta property="og:image" content="https://os.thequantumclub.com/og-image.gif" />
        <meta property="og:image:width" content="432" />
        <meta property="og:image:height" content="540" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@thequantumclub" />
        <meta name="twitter:title" content={`${categoryData.name} | The Quantum Club Insights`} />
        <meta name="twitter:description" content={categoryData.description} />
        <meta name="twitter:image" content="https://os.thequantumclub.com/og-image-twitter-v3.gif" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": categoryData.name,
          "description": categoryData.description,
          "url": `https://os.thequantumclub.com/blog/${category}`,
          "numberOfItems": posts.length,
          "itemListElement": posts.slice(0, 10).map((p, i) => ({
            "@type": "ListItem",
            "position": i + 1,
            "url": `https://os.thequantumclub.com/blog/${p.category}/${p.slug}`,
            "name": p.title
          }))
        })}</script>
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1 pt-8 md:pt-12">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
              <Link to="/home" className="hover:text-foreground transition-colors">Home</Link>
              <ChevronRight className="h-4 w-4" />
              <Link to="/blog" className="hover:text-foreground transition-colors">Insights</Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-foreground">{categoryData.name}</span>
            </nav>

            <div className="mb-12">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground mb-4">
                {categoryData.name}
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl">{categoryData.description}</p>
            </div>

            <section className="pb-16">
              <BlogGrid posts={posts} isLoading={isLoading} />
            </section>
          </div>

          <NewsletterCapture />
        </main>
      </div>
    </>
  );
};

export default BlogCategory;
