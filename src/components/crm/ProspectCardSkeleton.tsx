import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ProspectCardSkeletonProps {
  className?: string;
}

export function ProspectCardSkeleton({ className }: ProspectCardSkeletonProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'relative bg-gradient-to-br from-card/95 to-card/70 backdrop-blur-xl',
        'border border-border/40 rounded-xl p-3',
        className
      )}
    >
      <div className="pl-5">
        {/* Header with Avatar */}
        <div className="flex items-start gap-3 mb-2">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-12 rounded-full" />
        </div>

        {/* Company */}
        <div className="flex items-center gap-1.5 mb-2">
          <Skeleton className="w-3 h-3 rounded" />
          <Skeleton className="h-3 w-28" />
        </div>

        {/* Deal Value & Sentiment */}
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-20 ml-auto" />
        </div>
      </div>
    </motion.div>
  );
}

export function ProspectListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <ProspectCardSkeleton key={i} />
      ))}
    </div>
  );
}
