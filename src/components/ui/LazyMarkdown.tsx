/**
 * Lazy-loaded ReactMarkdown component
 * Reduces build memory by deferring markdown parsing library
 */
import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Options } from 'react-markdown';

const ReactMarkdown = lazy(() => import('react-markdown'));

interface LazyMarkdownProps extends Omit<Options, 'children'> {
  children: string;
  containerClassName?: string;
}

export function LazyMarkdown({ children, containerClassName, ...props }: LazyMarkdownProps) {
  return (
    <Suspense fallback={<Skeleton className="w-full h-20" />}>
      <div className={containerClassName}>
        <ReactMarkdown {...props}>
          {children}
        </ReactMarkdown>
      </div>
    </Suspense>
  );
}

export default LazyMarkdown;
