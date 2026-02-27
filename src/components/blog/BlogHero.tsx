import React from 'react';
import CategoryPills from './CategoryPills';
import BlogSearch from './BlogSearch';

interface BlogHeroProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  activeCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  resultsCount?: number;
}

const BlogHero: React.FC<BlogHeroProps> = ({
  searchQuery,
  onSearchChange,
  onSearchKeyDown,
  activeCategory,
  onCategoryChange,
  resultsCount,
}) => {
  return (
    <section className="pt-32 pb-12 md:pt-40 md:pb-16">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center mb-10 md:mb-14">
          <h1 className="text-display-sm md:text-display-md lg:text-display-lg font-semibold text-foreground tracking-tight mb-4">
            Insights
          </h1>
          <p className="text-body-lg text-muted-foreground max-w-lg mx-auto font-light">
            Career intelligence for top-tier talent.
          </p>
          <div className="mt-6 mx-auto w-12 border-t border-border" />
        </div>

        <div className="max-w-md mx-auto mb-10">
          <BlogSearch
            value={searchQuery}
            onChange={onSearchChange}
            onKeyDown={onSearchKeyDown}
            placeholder="Search articles..."
            resultsCount={resultsCount}
          />
          {searchQuery && (
            <p className="sr-only" aria-live="polite">
              Use arrow keys to navigate results, Enter to select, Escape to clear
            </p>
          )}
        </div>

        <div className="flex justify-center">
          <CategoryPills
            activeCategory={activeCategory}
            onSelect={onCategoryChange}
          />
        </div>
      </div>
    </section>
  );
};

export default BlogHero;
