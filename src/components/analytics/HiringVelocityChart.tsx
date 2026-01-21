import { DynamicChart } from "@/components/charts/DynamicChart";
import { HiringMetrics } from "@/hooks/useAnalytics";
import { format } from "date-fns";

interface HiringVelocityChartProps {
  data: HiringMetrics[];
  isLoading: boolean;
}

export function HiringVelocityChart({ data, isLoading }: HiringVelocityChartProps) {
  if (isLoading) {
    return (
      <div className="h-[400px] w-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading chart data...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[400px] w-full flex items-center justify-center">
        <div className="text-muted-foreground">No data available for the selected period</div>
      </div>
    );
  }

  // Format data for charts
  const chartData = [...data].reverse().map(metric => ({
    week: format(new Date(metric.week), 'MMM dd'),
    applications: metric.total_applications,
    hires: metric.hires,
    inProgress: metric.in_progress,
    rejections: metric.rejections,
    avgTimeToHire: Math.round(metric.avg_time_to_hire_days || 0),
  }));

  return (
    <div className="space-y-8">
      {/* Applications & Hires Trend */}
      <div>
        <h4 className="text-sm font-medium mb-4">Applications vs. Hires</h4>
        <DynamicChart
          type="bar"
          data={chartData}
          height={300}
          config={{
            xAxisKey: 'week',
            bars: [
              { dataKey: 'applications', fill: 'hsl(var(--primary))', name: 'Applications' },
              { dataKey: 'hires', fill: 'hsl(var(--chart-2))', name: 'Hires' },
              { dataKey: 'inProgress', fill: 'hsl(var(--chart-3))', name: 'In Progress' },
            ],
            legend: true,
          }}
        />
      </div>

      {/* Time to Hire Trend */}
      <div>
        <h4 className="text-sm font-medium mb-4">Average Time to Hire (Days)</h4>
        <DynamicChart
          type="line"
          data={chartData}
          height={200}
          config={{
            xAxisKey: 'week',
            lines: [
              { dataKey: 'avgTimeToHire', stroke: 'hsl(var(--chart-4))', name: 'Avg Days to Hire' },
            ],
            legend: true,
          }}
        />
      </div>
    </div>
  );
}
