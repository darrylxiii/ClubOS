/**
 * LazyMarkdown - Phase 9: ReactMarkdown Lazy Loading
 * Defers ~40KB of react-markdown until markdown content is rendered
 */

import { lazy, Suspense, ComponentProps } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load ReactMarkdown (~40KB deferred)
const ReactMarkdown = lazy(() => import('react-markdown'));

interface LazyMarkdownProps extends ComponentProps<typeof ReactMarkdown> {
  fallback?: React.ReactNode;
}

/**
 * Lazy-loaded ReactMarkdown wrapper
 * Use this instead of directly importing react-markdown in components
 */
export function LazyMarkdown({ fallback, ...props }: LazyMarkdownProps) {
  return (
    <Suspense fallback={fallback ?? <MarkdownSkeleton />}>
      <ReactMarkdown {...props} />
    </Suspense>
  );
}

function MarkdownSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}

export default LazyMarkdown;
