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
    <section className="pt-32 pb-8 md:pt-40 md:pb-12">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-foreground mb-4">
            The Quantum Club Insights
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Career intelligence for top-tier talent.
          </p>
        </div>

        <div className="max-w-xl mx-auto mb-8">
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
