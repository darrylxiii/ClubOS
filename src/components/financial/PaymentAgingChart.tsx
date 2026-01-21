import { usePaymentAging } from '@/hooks/useMoneybirdFinancials';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DynamicChart } from '@/components/charts/DynamicChart';

interface PaymentAgingChartProps {
  year?: number;
}

const COLORS = {
  current: 'hsl(var(--primary))',
  overdue_30: 'hsl(45 93% 47%)',     // amber
  overdue_60: 'hsl(32 95% 44%)',     // orange
  overdue_90: 'hsl(21 90% 48%)',     // dark orange
  overdue_90_plus: 'hsl(0 84% 60%)', // red
};

const LABELS = {
  current: 'Current',
  overdue_30: '1-30 days',
  overdue_60: '31-60 days',
  overdue_90: '61-90 days',
  overdue_90_plus: '90+ days',
};

export function PaymentAgingChart({ year }: PaymentAgingChartProps) {
  const aging = usePaymentAging(year);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const chartData = Object.entries(aging)
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => ({
      name: LABELS[key as keyof typeof LABELS],
      value,
      color: COLORS[key as keyof typeof COLORS],
    }));

  const totalOutstanding = Object.values(aging).reduce((sum, val) => sum + val, 0);

  if (totalOutstanding === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment Aging</CardTitle>
          <CardDescription>Outstanding invoice breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            No outstanding invoices
          </div>
        </CardContent>
      </Card>
    );
  }

  const colors = chartData.map(d => d.color);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Payment Aging</CardTitle>
        <CardDescription>
          {formatCurrency(totalOutstanding)} outstanding
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DynamicChart
          type="pie"
          data={chartData}
          height={200}
          config={{
            pies: [{
              dataKey: 'value',
              nameKey: 'name',
              cx: '50%',
              cy: '50%',
              innerRadius: 40,
              outerRadius: 70,
              colors,
            }],
            legend: true,
            tooltip: {
              formatter: (value: number) => formatCurrency(value),
            },
          }}
        />

        <div className="mt-4 space-y-2">
          {chartData.map((item) => (
            <div key={item.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <span>{item.name}</span>
              </div>
              <span className="font-medium">{formatCurrency(item.value)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
