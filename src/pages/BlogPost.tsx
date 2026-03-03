import React, { useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { ChevronRight, Calendar, Clock, ArrowLeft } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import ReadingProgress from '@/components/blog/ReadingProgress';
import BlogSchema from '@/components/blog/BlogSchema';
import AEOSummaryBox from '@/components/blog/AEOSummaryBox';
import ArticleContent from '@/components/blog/ArticleContent';
import ArticleSidebar from '@/components/blog/ArticleSidebar';
import AuthorCard from '@/components/blog/AuthorCard';
import ExpertReviewBadge from '@/components/blog/ExpertReviewBadge';
import TableOfContents from '@/components/blog/TableOfContents';
import RelatedArticles from '@/components/blog/RelatedArticles';
import SocialShareButtons from '@/components/blog/SocialShareButtons';
import FloatingShareBar from '@/components/blog/FloatingShareBar';
import ArticleReactions from '@/components/blog/ArticleReactions';
import SaveForLater from '@/components/blog/SaveForLater';
import ScrollCTA from '@/components/blog/ScrollCTA';
import { Button } from '@/components/ui/button';
import {
  getCategoryBySlug,
  getRelatedPosts,
  blogPosts,
} from '@/data/blog';
import { useDynamicBlogPost, useDynamicBlogPosts } from '@/hooks/useDynamicBlogPosts';
import { useBlogAnalytics } from '@/hooks/useBlogAnalytics';

const BlogPost: React.FC = () => {
  const { category, slug } = useParams<{ category: string; slug: string }>();
  const location = useLocation();

  // Use dynamic hook that checks DB first, then falls back to static
  const { data: post, isLoading } = useDynamicBlogPost(category || '', slug || '');
  const { data: allPosts = [] } = useDynamicBlogPosts();

  const categoryData = category ? getCategoryBySlug(category) : undefined;
  const relatedPosts = post ? getRelatedPosts(post.id, 3) : [];
  const popularPosts = allPosts.filter((p) => p.id !== post?.id).slice(0, 3);

  const { trackCTAClick } = useBlogAnalytics({
    postSlug: slug || '',
    enabled: !!post,
  });

  useEffect(() => {
    const hash = location.hash.slice(1);
    if (hash) {
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      window.scrollTo(0, 0);
    }
  }, [slug, location.hash]);

  if (isLoading) {
    return (
      <main className="flex-1 flex items-center justify-center pt-32">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading article...</p>
        </div>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="flex-1 flex items-center justify-center pt-32">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground mb-4">Article Not Found</h1>
          <p className="text-muted-foreground mb-6">The article you're looking for doesn't exist.</p>
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

  const formattedDate = new Date(post.publishedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const shareUrl = `https://os.thequantumclub.com/blog/${post.category}/${post.slug}`;

  return (
    <>
      <Helmet>
        <title>{post.metaTitle}</title>
        <meta name="description" content={post.metaDescription} />
        <meta name="keywords" content={post.keywords.join(', ')} />
      </Helmet>

      <BlogSchema post={post} categoryData={categoryData} />

      <div className="min-h-screen flex flex-col bg-background">
        <ReadingProgress postSlug={slug} />

        <main className="flex-1 pt-8 md:pt-12">
          <article className="max-w-7xl mx-auto px-4 md:px-8">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6" aria-label="Breadcrumb">
              <Link to="/home" className="hover:text-foreground transition-colors">Home</Link>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
              <Link to="/blog" className="hover:text-foreground transition-colors">Insights</Link>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
              {categoryData && (
                <>
                  <Link to={`/blog/${category}`} className="hover:text-foreground transition-colors">
                    {categoryData.name}
                  </Link>
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
              <span className="text-foreground truncate max-w-[200px]">{post.title}</span>
            </nav>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground mb-6 max-w-4xl">
              {post.title}
            </h1>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-6">
              <AuthorCard author={post.author} size="md" linkToProfile />
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {post.reviewedBy && (
                  <>
                    <span className="hidden sm:inline">|</span>
                    <ExpertReviewBadge reviewer={post.reviewedBy} />
                  </>
                )}
                <span className="hidden sm:inline">|</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  <time dateTime={post.publishedAt}>{formattedDate}</time>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  {post.readTime} min read
                </span>
              </div>
            </div>

            <div className="mb-8 pb-6 border-b border-border flex items-center justify-between gap-4 flex-wrap">
              <SocialShareButtons
                url={shareUrl}
                title={post.title}
                description={post.excerpt}
                onShare={(platform) => trackCTAClick('share', platform)}
              />
              <SaveForLater postSlug={post.slug} postTitle={post.title} />
            </div>

            <div className="mb-8">
              <img
                src={post.heroImage.url}
                alt={post.heroImage.alt}
                className="w-full aspect-[16/9] md:aspect-[21/9] object-cover rounded-2xl"
                loading="eager"
              />
              {post.heroImage.caption && (
                <p className="mt-3 text-center text-sm text-muted-foreground">{post.heroImage.caption}</p>
              )}
            </div>

            <div className="flex gap-12">
              <div className="flex-1 min-w-0">
                <AEOSummaryBox takeaways={post.keyTakeaways} />
                <TableOfContents content={post.content} variant="mobile" />
                <ArticleContent content={post.content} />
                <ArticleReactions postSlug={post.slug} />
              </div>
              <ArticleSidebar post={post} popularPosts={popularPosts} />
            </div>
          </article>

          <RelatedArticles posts={relatedPosts} />
        </main>

        <FloatingShareBar
          url={shareUrl}
          title={post.title}
          description={post.excerpt}
          onShare={(platform) => trackCTAClick('share', platform)}
        />

        <ScrollCTA />
      </div>
    </>
  );
};

export default BlogPost;
