import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DynamicChart } from "@/components/charts/DynamicChart";
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
          <DynamicChart
            type="area"
            data={chartData}
            height={350}
            config={{
              xAxisKey: 'date',
              areas: [
                { dataKey: 'arrFormatted', stroke: 'hsl(var(--primary))', fill: 'hsl(var(--primary))', fillOpacity: 0.3, name: 'ARR' },
                { dataKey: 'mrrFormatted', stroke: 'hsl(var(--chart-2))', fill: 'hsl(var(--chart-2))', fillOpacity: 0.3, name: 'MRR' },
              ],
              yAxisFormatter: (value: number) => `€${(value / 100000).toFixed(0)}k`,
              tooltip: {
                formatter: (value: any) => [formatCurrency(value), ''],
                labelFormatter: (label: string) => `Period: ${label}`,
              },
              legend: true,
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
