import React, { useEffect, useRef, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from '@/lib/motion';
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
  post, searchQuery, isFocused, focusedRef, index 
}: { 
  post: BlogPost; searchQuery?: string; isFocused: boolean;
  focusedRef: React.RefObject<HTMLDivElement | null>;
  index: number;
}) => (
  <motion.div
    ref={isFocused ? focusedRef : undefined}
    role="option"
    aria-selected={isFocused}
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: index * 0.06, ease: [0.25, 0.1, 0.25, 1] }}
  >
    <BlogCard post={post} searchQuery={searchQuery} isFocused={isFocused} />
  </motion.div>
));
MemoizedBlogCardWrapper.displayName = 'MemoizedBlogCardWrapper';

const BlogGrid: React.FC<BlogGridProps> = ({ posts, columns = 3, searchQuery, focusedIndex = -1, isLoading = false }) => {
  const { t } = useTranslation('common');
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
      <div className="text-center py-20">
        <p className="text-muted-foreground text-body-sm">
          {searchQuery ? t('blog.noArticlesFoundFor', { query: searchQuery }) : t('blog.noArticlesFound')}
        </p>
      </div>
    );
  }

  return (
    <div id="blog-search-results" role="listbox" aria-label={t('blog.blogArticles')}
      className={`grid grid-cols-1 md:grid-cols-2 ${columns === 3 ? 'lg:grid-cols-3' : ''} gap-6 md:gap-8`}>
      {posts.map((post, index) => (
        <MemoizedBlogCardWrapper key={post.id} post={post} searchQuery={searchQuery}
          isFocused={index === focusedIndex} focusedRef={focusedRef} index={index} />
      ))}
    </div>
  );
};

export default memo(BlogGrid);
