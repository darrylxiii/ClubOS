import React from 'react';
import { cn } from '@/lib/utils';

interface BlogCardSkeletonProps {
  featured?: boolean;
  className?: string;
}

const BlogCardSkeleton: React.FC<BlogCardSkeletonProps> = ({ featured = false, className }) => {
  return (
    <div
      className={cn(
        "bg-card rounded-xl overflow-hidden shadow-glass-sm",
        featured && "md:grid md:grid-cols-2 md:gap-0",
        className
      )}
      aria-hidden="true"
    >
      <div className={cn("aspect-[16/9] bg-muted animate-pulse", featured && "md:aspect-auto md:h-full")} />
      <div className={cn("p-5 md:p-6", featured && "md:p-8 md:flex md:flex-col md:justify-center")}>
        <div className="h-2.5 w-16 bg-muted rounded animate-pulse mb-3" />
        <div className="space-y-2 mb-4">
          <div className={cn("h-5 bg-muted rounded animate-pulse", featured ? "w-4/5" : "w-full")} />
          <div className={cn("h-5 bg-muted rounded animate-pulse", featured ? "w-3/5" : "w-3/4")} />
        </div>
        <div className="space-y-2 mb-4">
          <div className="h-3.5 w-full bg-muted rounded animate-pulse" />
          <div className="h-3.5 w-5/6 bg-muted rounded animate-pulse" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-3.5 w-20 bg-muted rounded animate-pulse" />
          <div className="h-3.5 w-14 bg-muted rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
};

export default BlogCardSkeleton;
