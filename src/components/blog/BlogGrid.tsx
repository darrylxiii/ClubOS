import React, { useEffect, useRef, memo } from 'react';
import { BlogPost } from '@/data/blog';
import BlogCard from './BlogCard';
import BlogCardSkeleton from './BlogCardSkeleton';

interface BlogGridProps {
  posts: BlogPost[];
  columns?: 2 | 3;
  searchQuery?: string;
  focusedIndex?: number;
  isLoading?: boolean;
}

const MemoizedBlogCardWrapper = memo(({ 
  post, searchQuery, isFocused, focusedRef 
}: { 
  post: BlogPost; searchQuery?: string; isFocused: boolean;
  focusedRef: React.RefObject<HTMLDivElement | null>;
}) => (
  <div ref={isFocused ? focusedRef : undefined} role="option" aria-selected={isFocused}>
    <BlogCard post={post} searchQuery={searchQuery} isFocused={isFocused} />
  </div>
));
MemoizedBlogCardWrapper.displayName = 'MemoizedBlogCardWrapper';

const BlogGrid: React.FC<BlogGridProps> = ({ posts, columns = 3, searchQuery, focusedIndex = -1, isLoading = false }) => {
  const focusedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focusedIndex >= 0 && focusedRef.current) {
      focusedRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [focusedIndex]);

  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 ${columns === 3 ? 'lg:grid-cols-3' : ''} gap-6 md:gap-8`}>
        {Array.from({ length: 6 }).map((_, i) => <BlogCardSkeleton key={i} />)}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">
          {searchQuery ? `No articles found for "${searchQuery}"` : 'No articles found.'}
        </p>
      </div>
    );
  }

  return (
    <div id="blog-search-results" role="listbox" aria-label="Blog articles"
      className={`grid grid-cols-1 md:grid-cols-2 ${columns === 3 ? 'lg:grid-cols-3' : ''} gap-6 md:gap-8`}>
      {posts.map((post, index) => (
        <MemoizedBlogCardWrapper key={post.id} post={post} searchQuery={searchQuery}
          isFocused={index === focusedIndex} focusedRef={focusedRef} />
      ))}
    </div>
  );
};

export default memo(BlogGrid);
