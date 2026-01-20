import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="week" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Bar dataKey="applications" fill="hsl(var(--primary))" name="Applications" />
            <Bar dataKey="hires" fill="hsl(var(--chart-2))" name="Hires" />
            <Bar dataKey="inProgress" fill="hsl(var(--chart-3))" name="In Progress" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Time to Hire Trend */}
      <div>
        <h4 className="text-sm font-medium mb-4">Average Time to Hire (Days)</h4>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="week" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="avgTimeToHire" 
              stroke="hsl(var(--chart-4))" 
              strokeWidth={2}
              name="Avg Days to Hire"
              dot={{ fill: 'hsl(var(--chart-4))' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}