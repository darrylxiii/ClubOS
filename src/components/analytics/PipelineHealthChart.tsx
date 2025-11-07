import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { PipelineHealth } from "@/hooks/useAnalytics";

interface PipelineHealthChartProps {
  data: PipelineHealth[];
  isLoading: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  'applied': 'hsl(var(--chart-1))',
  'screening': 'hsl(var(--chart-2))',
  'interviewing': 'hsl(var(--chart-3))',
  'offer': 'hsl(var(--chart-4))',
  'hired': 'hsl(var(--chart-5))',
  'rejected': 'hsl(var(--destructive))',
};

const STATUS_LABELS: Record<string, string> = {
  'applied': 'Applied',
  'screening': 'Screening',
  'interviewing': 'Interviewing',
  'offer': 'Offer',
  'hired': 'Hired',
  'rejected': 'Rejected',
};

export function PipelineHealthChart({ data, isLoading }: PipelineHealthChartProps) {
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
        <div className="text-muted-foreground">No pipeline data available</div>
      </div>
    );
  }

  // Aggregate by status (latest week)
  const latestWeekData = data.filter(d => d.week === data[0]?.week);
  const statusCounts = latestWeekData.reduce((acc, item) => {
    const status = item.status;
    if (!acc[status]) {
      acc[status] = {
        status: STATUS_LABELS[status] || status,
        count: 0,
        avgDays: 0,
      };
    }
    acc[status].count += item.candidate_count;
    acc[status].avgDays = Math.round(item.avg_days_in_stage);
    return acc;
  }, {} as Record<string, { status: string; count: number; avgDays: number }>);

  const chartData = Object.values(statusCounts).sort((a, b) => {
    const order = ['Applied', 'Screening', 'Interviewing', 'Offer', 'Hired', 'Rejected'];
    return order.indexOf(a.status) - order.indexOf(b.status);
  });

  return (
    <div className="space-y-8">
      {/* Candidates by Stage */}
      <div>
        <h4 className="text-sm font-medium mb-4">Candidates by Pipeline Stage</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              type="number"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              dataKey="status" 
              type="category"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              width={100}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number, name: string, props: any) => [
                `${value} candidates (${props.payload.avgDays}d avg)`,
                'Count'
              ]}
            />
            <Bar dataKey="count" name="Candidates">
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={STATUS_COLORS[Object.keys(STATUS_LABELS).find(k => STATUS_LABELS[k] === entry.status) || 'applied']} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stage Duration Analysis */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {chartData.map((item) => (
          <div 
            key={item.status}
            className="p-4 border rounded-lg"
            style={{
              borderColor: STATUS_COLORS[Object.keys(STATUS_LABELS).find(k => STATUS_LABELS[k] === item.status) || 'applied'],
            }}
          >
            <div className="text-sm font-medium mb-1">{item.status}</div>
            <div className="text-2xl font-bold">{item.count}</div>
            <div className="text-xs text-muted-foreground">
              {item.avgDays}d avg
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}