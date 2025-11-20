import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageLoadMoreTriggerProps {
  onLoadMore: () => void;
  hasMore: boolean;
  loading?: boolean;
  className?: string;
}

export const MessageLoadMoreTrigger = ({
  onLoadMore,
  hasMore,
  loading = false,
  className
}: MessageLoadMoreTriggerProps) => {
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = observerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, loading, onLoadMore]);

  if (!hasMore) return null;

  return (
    <div
      ref={observerRef}
      className={cn(
        "flex items-center justify-center py-4",
        className
      )}
    >
      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading more messages...</span>
        </div>
      )}
    </div>
  );
};
