import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LineChart, 
  Line,
  Area,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";

interface ChartLine {
  dataKey: string;
  name: string;
  color: string;
  type?: 'line' | 'area' | 'bar';
}

interface TrendChartProps {
  data: Array<Record<string, any>>;
  lines: ChartLine[];
  xAxisKey: string;
  title: string;
  description?: string;
  height?: number;
  chartType?: 'line' | 'mixed';
}

export const TrendChart = ({ 
  data, 
  lines, 
  xAxisKey, 
  title, 
  description,
  height = 400,
  chartType = 'line'
}: TrendChartProps) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-card p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              className="stroke-muted" 
              vertical={false}
            />
            <XAxis 
              dataKey={xAxisKey} 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
            />
            {lines.map(line => {
              if (line.type === 'area') {
                return (
                  <Area
                    key={line.dataKey}
                    type="monotone"
                    dataKey={line.dataKey}
                    stroke={line.color}
                    fill={line.color}
                    fillOpacity={0.1}
                    strokeWidth={2}
                    name={line.name}
                  />
                );
              } else if (line.type === 'bar') {
                return (
                  <Bar
                    key={line.dataKey}
                    dataKey={line.dataKey}
                    fill={line.color}
                    name={line.name}
                    radius={[4, 4, 0, 0]}
                  />
                );
              } else {
                return (
                  <Line
                    key={line.dataKey}
                    type="monotone"
                    dataKey={line.dataKey}
                    stroke={line.color}
                    strokeWidth={2}
                    name={line.name}
                    dot={{ fill: line.color, r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                );
              }
            })}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
