import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import BlogGrid from '@/components/blog/BlogGrid';
import NewsletterCapture from '@/components/blog/NewsletterCapture';
import { Button } from '@/components/ui/button';
import { getCategoryBySlug, getPostsByCategory } from '@/data/blog';

const BlogCategory: React.FC = () => {
  const { category } = useParams<{ category: string }>();
  const categoryData = category ? getCategoryBySlug(category) : undefined;

  const posts = useMemo(() => {
    return category ? getPostsByCategory(category) : [];
  }, [category]);

  if (!categoryData) {
    return (
      <main className="flex-1 flex items-center justify-center pt-32">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground mb-4">Category Not Found</h1>
          <p className="text-muted-foreground mb-6">The category you're looking for doesn't exist.</p>
          <Link to="/blog">
            <Button className="rounded-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Insights
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <>
      <Helmet>
        <title>{categoryData.name} | The Quantum Club Insights</title>
        <meta name="description" content={categoryData.description} />
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
              <BlogGrid posts={posts} />
            </section>
          </div>

          <NewsletterCapture />
        </main>
      </div>
    </>
  );
};

export default BlogCategory;
