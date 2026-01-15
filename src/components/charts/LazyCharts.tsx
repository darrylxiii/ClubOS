import React, { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Chart loading skeleton
export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="w-full" style={{ height }}>
      <Skeleton className="w-full h-full rounded-lg" />
    </div>
  );
}

// Type for recharts module
type RechartsModule = typeof import('recharts');

// Lazy wrapper component that provides recharts components via render prop
interface LazyChartsProps {
  children: (components: RechartsModule) => React.ReactNode;
  height?: number;
}

export function LazyCharts({ children, height = 300 }: LazyChartsProps) {
  const [components, setComponents] = useState<RechartsModule | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    import('recharts')
      .then(setComponents)
      .catch(setError);
  }, []);

  if (error) {
    return (
      <div className="w-full flex items-center justify-center text-muted-foreground" style={{ height }}>
        Failed to load chart
      </div>
    );
  }

  if (!components) {
    return <ChartSkeleton height={height} />;
  }

  return <>{children(components)}</>;
}
