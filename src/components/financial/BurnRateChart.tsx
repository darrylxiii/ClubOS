import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DynamicChart } from '@/components/charts/DynamicChart';
import { useCostIntelligence } from '@/hooks/useSubscriptionBudgets';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/revenueCalculations';

export function BurnRateChart() {
  const { data, isLoading: intelLoading } = useCostIntelligence();
  const now = new Date();
  const currentYear = now.getFullYear();

  // Query real monthly expenses grouped by month
  const { data: monthlyExpenses, isLoading: expLoading } = useQuery({
    queryKey: ['monthly-expense-actuals', currentYear],
    queryFn: async () => {
      const { data: expenses, error } = await supabase
        .from('operating_expenses')
        .select('amount, expense_date')
        .gte('expense_date', `${currentYear}-01-01`)
        .lte('expense_date', `${currentYear}-12-31`);
      if (error) throw error;

      // Group by month index
      const byMonth: Record<number, number> = {};
      (expenses || []).forEach(e => {
        const monthIdx = new Date(e.expense_date).getMonth();
        byMonth[monthIdx] = (byMonth[monthIdx] || 0) + (e.amount || 0);
      });
      return byMonth;
    },
  });

  const isLoading = intelLoading || expLoading;

  if (isLoading) {
    return <Card><CardContent className="pt-6"><Skeleton className="h-[300px]" /></CardContent></Card>;
  }

  const monthlyBurn = data?.totalMRC || 0;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Build historical from real data + projected from current MRC
  const chartData = months.map((month, i) => {
    const isPast = i <= now.getMonth();
    const isProjected = i > now.getMonth();
    // Real actual = operating expenses for that month + subscription MRC
    const actualExpenses = monthlyExpenses?.[i] || 0;
    const actual = isPast ? actualExpenses + monthlyBurn : undefined;
    const projected = isProjected ? monthlyBurn * (1 + (i - now.getMonth()) * 0.02) : undefined;
    return {
      month,
      actual: actual !== undefined ? Math.round(actual) : null,
      projected: projected !== undefined ? Math.round(projected) : null,
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
