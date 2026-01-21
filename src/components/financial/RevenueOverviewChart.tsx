import { useMoneybirdFinancials, useSyncMoneybirdFinancials } from '@/hooks/useMoneybirdFinancials';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { DynamicChart } from '@/components/charts/DynamicChart';

interface RevenueOverviewChartProps {
  year?: number;
}

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function RevenueOverviewChart({ year }: RevenueOverviewChartProps) {
  const { data: metrics, isLoading } = useMoneybirdFinancials(year);
  const { mutate: syncData, isPending: isSyncing } = useSyncMoneybirdFinancials();

  const chartData = (metrics?.revenue_by_month || []).map(item => {
    const monthIndex = parseInt(item.month.split('-')[1]) - 1;
    return {
      month: monthNames[monthIndex],
      revenue: item.revenue,
      paid: item.paid,
      outstanding: item.revenue - item.paid,
      invoices: item.count,
    };
  });

  const handleSync = () => {
    syncData(year);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] space-y-4">
        <p className="text-muted-foreground">No financial data available</p>
        <Button onClick={handleSync} disabled={isSyncing}>
          {isSyncing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync from Moneybird
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Last synced: {formatDistanceToNow(new Date(metrics.last_synced_at), { addSuffix: true })}
        </div>
        <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing}>
          {isSyncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-2">Refresh</span>
        </Button>
      </div>

      <DynamicChart
        type="composed"
        data={chartData}
        height={300}
        config={{
          xAxisKey: 'month',
          bars: [
            { dataKey: 'paid', fill: 'hsl(var(--primary))', name: 'Collected' },
            { dataKey: 'outstanding', fill: 'hsl(var(--muted-foreground) / 0.3)', name: 'Outstanding', stackId: 'stack' },
          ],
          lines: [
            { dataKey: 'revenue', stroke: 'hsl(var(--chart-2))', name: 'Total Invoiced' },
          ],
          yAxisFormatter: (value: number) => `€${(value / 1000).toFixed(0)}k`,
          legend: true,
          tooltip: {
            formatter: (value: number, name: string) => [
              `€${value.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
              name === 'paid' ? 'Collected' : name === 'revenue' ? 'Invoiced' : 'Outstanding'
            ],
          },
        }}
      />
    </div>
  );
}
