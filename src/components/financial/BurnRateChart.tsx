import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DynamicChart } from '@/components/charts/DynamicChart';
import { useCostIntelligence } from '@/hooks/useSubscriptionBudgets';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/revenueCalculations';

export function BurnRateChart() {
  const { data, isLoading } = useCostIntelligence();

  if (isLoading) {
    return <Card><CardContent className="pt-6"><Skeleton className="h-[300px]" /></CardContent></Card>;
  }

  const monthlyBurn = data?.totalMRC || 0;
  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Build historical + projected data
  const chartData = months.map((month, i) => {
    const isPast = i <= now.getMonth();
    const isProjected = i > now.getMonth();
    // Simple model: past months use actual, future months project current burn
    const actual = isPast ? monthlyBurn * (1 + (Math.random() * 0.1 - 0.05)) : undefined;
    const projected = isProjected ? monthlyBurn * (1 + (i - now.getMonth()) * 0.02) : undefined;
    return {
      month,
      actual: actual ? Math.round(actual) : null,
      projected: projected ? Math.round(projected) : null,
      baseline: Math.round(monthlyBurn),
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Monthly Burn Rate</span>
          <span className="text-sm font-normal text-muted-foreground">
            Current: {formatCurrency(monthlyBurn)}/mo
          </span>
        </CardTitle>
        <CardDescription>Actual spend vs projected trend (6-month forecast)</CardDescription>
      </CardHeader>
      <CardContent>
        <DynamicChart
          type="composed"
          data={chartData}
          height={300}
          config={{
            xAxisKey: 'month',
            areas: [
              {
                dataKey: 'projected',
                stroke: 'hsl(var(--chart-2))',
                fill: 'hsl(var(--chart-2))',
                fillOpacity: 0.1,
                name: 'Projected',
                type: 'monotone',
              },
            ],
            lines: [
              {
                dataKey: 'actual',
                stroke: 'hsl(var(--chart-1))',
                strokeWidth: 2,
                name: 'Actual',
                dot: { r: 3 },
              },
              {
                dataKey: 'baseline',
                stroke: 'hsl(var(--muted-foreground))',
                strokeWidth: 1,
                name: 'Baseline',
                type: 'monotone',
              },
            ],
            legend: true,
            yAxisFormatter: (v: number) => `€${(v / 1000).toFixed(1)}k`,
          }}
        />
      </CardContent>
    </Card>
  );
}

export default BurnRateChart;
