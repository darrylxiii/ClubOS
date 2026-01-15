import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import { useMoneybirdFinancials, useSyncMoneybirdFinancials } from '@/hooks/useMoneybirdFinancials';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis 
            dataKey="month" 
            className="text-xs"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis 
            className="text-xs"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            formatter={(value: number, name: string) => [
              `€${value.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
              name === 'paid' ? 'Collected' : name === 'revenue' ? 'Invoiced' : 'Outstanding'
            ]}
          />
          <Legend />
          <Bar 
            dataKey="paid" 
            fill="hsl(var(--primary))" 
            name="Collected"
            radius={[4, 4, 0, 0]}
          />
          <Bar 
            dataKey="outstanding" 
            fill="hsl(var(--muted-foreground) / 0.3)" 
            name="Outstanding"
            radius={[4, 4, 0, 0]}
            stackId="stack"
          />
          <Line 
            type="monotone" 
            dataKey="revenue" 
            stroke="hsl(var(--chart-2))" 
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--chart-2))' }}
            name="Total Invoiced"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
