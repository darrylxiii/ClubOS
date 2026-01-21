/**
 * Lazy-loaded Recharts components
 * This wrapper reduces build-time memory by deferring recharts loading
 * 
 * IMPORTANT: All recharts imports should go through this file to enable
 * code splitting and reduce initial bundle size.
 * 
 * USE DynamicChart from '@/components/charts/DynamicChart' for a simpler API.
 */
import { lazy, Suspense, type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Chart fallback skeleton
const ChartSkeleton = ({ className = "w-full h-[300px]" }: { className?: string }) => (
  <Skeleton className={className} />
);

// Lazy load the main chart components with proper typing
const LazyLineChartComponent = lazy(() => 
  import('recharts').then(m => ({ default: m.LineChart as any }))
);

const LazyBarChartComponent = lazy(() => 
  import('recharts').then(m => ({ default: m.BarChart as any }))
);

const LazyPieChartComponent = lazy(() => 
  import('recharts').then(m => ({ default: m.PieChart as any }))
);

const LazyAreaChartComponent = lazy(() => 
  import('recharts').then(m => ({ default: m.AreaChart as any }))
);

const LazyRadarChartComponent = lazy(() => 
  import('recharts').then(m => ({ default: m.RadarChart as any }))
);

const LazyFunnelChartComponent = lazy(() => 
  import('recharts').then(m => ({ default: m.FunnelChart as any }))
);

const LazyComposedChartComponent = lazy(() => 
  import('recharts').then(m => ({ default: m.ComposedChart as any }))
);

// Wrapped lazy components with Suspense
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

export function LazyComposedChart(props: any) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <LazyComposedChartComponent {...props} />
    </Suspense>
  );
}

// ChartContainer is defined below

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

// NOTE: Sub-components like XAxis, YAxis, Tooltip, etc. must be imported
// dynamically within components that use charts. They cannot be re-exported
// here as that would defeat the purpose of lazy loading.
//
// Example usage in a component:
// 
// import { LazyLineChart, ChartContainer } from '@/components/charts/LazyCharts';
// 
// // Inside your component, dynamically import sub-components
// const [chartComponents, setChartComponents] = useState<any>(null);
// useEffect(() => {
//   import('recharts').then(mod => {
//     setChartComponents({
//       XAxis: mod.XAxis,
//       YAxis: mod.YAxis,
//       // etc.
//     });
//   });
// }, []);
