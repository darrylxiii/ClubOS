import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Loader2, TrendingUp } from "lucide-react";
import { format } from "date-fns";

interface ARRChartProps {
  data: any[] | undefined;
  isLoading: boolean;
}

export function ARRChart({ data, isLoading }: ARRChartProps) {
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  const chartData = data?.map(item => ({
    ...item,
    date: format(new Date(item.metric_date), 'MMM yyyy'),
    arrFormatted: item.arr,
    mrrFormatted: item.mrr,
  })) || [];

  // Calculate growth metrics
  const firstMonth = data?.[0];
  const lastMonth = data?.[data?.length - 1];
  const totalGrowth = firstMonth && lastMonth && firstMonth.arr > 0
    ? ((lastMonth.arr - firstMonth.arr) / firstMonth.arr) * 100
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              ARR Growth Trajectory
            </CardTitle>
            <CardDescription>Annual recurring revenue over time</CardDescription>
          </div>
          {totalGrowth !== 0 && (
            <div className={`text-sm font-medium px-3 py-1 rounded-full ${totalGrowth >= 0 ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
              {totalGrowth >= 0 ? '+' : ''}{totalGrowth.toFixed(1)}% total
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[350px]">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[350px] text-muted-foreground">
            No revenue data available yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="arrGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tickFormatter={(value) => `€${(value / 100000).toFixed(0)}k`}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                formatter={(value: any) => [formatCurrency(value), '']}
                labelFormatter={(label) => `Period: ${label}`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="arrFormatted" 
                stroke="hsl(var(--primary))" 
                fillOpacity={1}
                fill="url(#arrGradient)"
                name="ARR"
                strokeWidth={2}
              />
              <Area 
                type="monotone" 
                dataKey="mrrFormatted" 
                stroke="hsl(var(--chart-2))" 
                fillOpacity={1}
                fill="url(#mrrGradient)"
                name="MRR"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
