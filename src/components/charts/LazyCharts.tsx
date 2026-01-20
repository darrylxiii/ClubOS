/**
 * Lazy-loaded Recharts components
 * This wrapper reduces build-time memory by deferring recharts loading
 */
import { lazy, Suspense, type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load the chart components
const LazyLineChartComponent = lazy(() => 
  import('recharts').then(m => ({ default: m.LineChart }))
);

const LazyBarChartComponent = lazy(() => 
  import('recharts').then(m => ({ default: m.BarChart }))
);

const LazyPieChartComponent = lazy(() => 
  import('recharts').then(m => ({ default: m.PieChart }))
);

const LazyAreaChartComponent = lazy(() => 
  import('recharts').then(m => ({ default: m.AreaChart }))
);

const LazyRadarChartComponent = lazy(() => 
  import('recharts').then(m => ({ default: m.RadarChart }))
);

const LazyFunnelChartComponent = lazy(() => 
  import('recharts').then(m => ({ default: m.FunnelChart }))
);

// Chart fallback skeleton
const ChartSkeleton = ({ className = "w-full h-[300px]" }: { className?: string }) => (
  <Skeleton className={className} />
);

// Wrapped lazy components with Suspense - using any to bypass complex recharts typing
export function LazyLineChart(props: any) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <LazyLineChartComponent {...props} />
    </Suspense>
  );
}

export function LazyBarChart(props: any) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <LazyBarChartComponent {...props} />
    </Suspense>
  );
}

export function LazyPieChart(props: any) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <LazyPieChartComponent {...props} />
    </Suspense>
  );
}

export function LazyAreaChart(props: any) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <LazyAreaChartComponent {...props} />
    </Suspense>
  );
}

export function LazyRadarChart(props: any) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <LazyRadarChartComponent {...props} />
    </Suspense>
  );
}

export function LazyFunnelChart(props: any) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <LazyFunnelChartComponent {...props} />
    </Suspense>
  );
}

// Re-export sub-components that are used inside charts
export { 
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
  Bar,
  Pie,
  Cell,
  Area,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Funnel,
  LabelList,
} from 'recharts';

// Chart wrapper that handles the Suspense boundary
export function ChartContainer({ 
  children, 
  className = "w-full h-[300px]" 
}: { 
  children: ReactNode;
  className?: string;
}) {
  return (
    <Suspense fallback={<ChartSkeleton className={className} />}>
      {children}
    </Suspense>
  );
}
