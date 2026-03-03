import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams, useNavigate } from 'react-router-dom';
import BlogHero from '@/components/blog/BlogHero';
import BlogFeatured from '@/components/blog/BlogFeatured';
import BlogGrid from '@/components/blog/BlogGrid';
import NewsletterCapture from '@/components/blog/NewsletterCapture';
import BlogErrorBoundary from '@/components/blog/BlogErrorBoundary';
import { useDynamicBlogPosts, useFeaturedBlogPost } from '@/hooks/useDynamicBlogPosts';

const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const Blog: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [activeCategory, setActiveCategory] = useState<string | null>(
    searchParams.get('category') || null,
  );
  const [focusedResultIndex, setFocusedResultIndex] = useState(-1);

  const { data: allPosts = [], isLoading } = useDynamicBlogPosts();
  const { data: featuredPost } = useFeaturedBlogPost();

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('q', debouncedSearch);
    if (activeCategory) params.set('category', activeCategory);
    setSearchParams(params, { replace: true });
  }, [debouncedSearch, activeCategory, setSearchParams]);

  useEffect(() => {
    setFocusedResultIndex(-1);
  }, [debouncedSearch]);

  const filteredPosts = useMemo(() => {
    let posts = allPosts;

    if (debouncedSearch.trim()) {
      const lowerSearch = debouncedSearch.toLowerCase();
      posts = posts.filter(
        (post) =>
          post.title.toLowerCase().includes(lowerSearch) ||
          post.excerpt.toLowerCase().includes(lowerSearch) ||
          post.keyTakeaways?.some((t) => t.toLowerCase().includes(lowerSearch)),
      );
    }

    if (activeCategory) {
      posts = posts.filter((post) => post.category === activeCategory);
    }

    if (!debouncedSearch && !activeCategory && featuredPost) {
      posts = posts.filter((post) => post.id !== featuredPost.id);
    }

    return posts;
  }, [allPosts, debouncedSearch, activeCategory, featuredPost]);

  // Pagination
  const POSTS_PER_PAGE = 12;
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE);

  const visiblePosts = useMemo(() => filteredPosts.slice(0, visibleCount), [filteredPosts, visibleCount]);
  const hasMore = visibleCount < filteredPosts.length;

  const loadMore = useCallback(() => {
    setVisibleCount(prev => prev + POSTS_PER_PAGE);
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(POSTS_PER_PAGE);
  }, [debouncedSearch, activeCategory]);

  const showFeatured = !debouncedSearch && !activeCategory && featuredPost;
  const resultsCount = filteredPosts.length;
  const isSearching = debouncedSearch.trim().length > 0;

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const totalResults = filteredPosts.length;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedResultIndex((prev) => (prev < totalResults - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedResultIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        if (focusedResultIndex >= 0 && filteredPosts[focusedResultIndex]) {
          e.preventDefault();
          const post = filteredPosts[focusedResultIndex];
          navigate(`/blog/${post.category}/${post.slug}`);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setFocusedResultIndex(-1);
        setSearchQuery('');
        break;
    }
  };

  return (
    <>
      <Helmet>
        <title>Insights | The Quantum Club</title>
        <meta name="description" content="Career intelligence for top-tier talent. Explore articles on career strategy, talent trends, leadership, and industry insights." />
        <link rel="canonical" href="https://os.thequantumclub.com/blog" />
        <meta property="og:title" content="Insights | The Quantum Club" />
        <meta property="og:description" content="Career intelligence for top-tier talent. Explore articles on career strategy, talent trends, leadership, and industry insights." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://os.thequantumclub.com/blog" />
        <meta property="og:image" content="https://os.thequantumclub.com/og-image.gif" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@thequantumclub" />
        <meta name="twitter:title" content="Insights | The Quantum Club" />
        <meta name="twitter:description" content="Career intelligence for top-tier talent. Explore articles on career strategy, talent trends, and leadership." />
        <meta name="twitter:image" content="https://os.thequantumclub.com/og-image.gif" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1">
          <BlogHero
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSearchKeyDown={handleSearchKeyDown}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            resultsCount={isSearching ? resultsCount : undefined}
          />

          <section className="max-w-7xl mx-auto px-4 md:px-8 pb-24">
            <BlogErrorBoundary>
              {showFeatured && <BlogFeatured post={featuredPost} />}

              <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-medium tracking-tight text-foreground">
                  {activeCategory
                    ? `${activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1).replace('-', ' ')} Articles`
                    : isSearching
                      ? `Results for "${debouncedSearch}"`
                      : 'Latest Articles'}
                </h2>
                {(isSearching || activeCategory) && (
                  <span className="text-body-sm text-muted-foreground">
                    {resultsCount} {resultsCount === 1 ? 'result' : 'results'}
                  </span>
                )}
              </div>

              <BlogGrid
                posts={visiblePosts}
                searchQuery={debouncedSearch}
                focusedIndex={isSearching ? focusedResultIndex : -1}
                isLoading={isLoading}
              />

              {hasMore && (
                <div className="flex justify-center mt-12">
                  <button
                    onClick={loadMore}
                    className="px-8 py-3 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
                  >
                    Load more articles
                  </button>
                </div>
              )}
            </BlogErrorBoundary>
          </section>

          <NewsletterCapture />
        </main>
      </div>
    </>
  );
};

export default Blog;
