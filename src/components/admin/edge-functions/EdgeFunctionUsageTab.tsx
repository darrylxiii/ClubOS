import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEdgeFunctionUsageSummary } from '@/hooks/useEdgeFunctionDailyStats';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, Calendar } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const DATE_RANGES = [
  { label: 'Today', days: 1 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
];

export function EdgeFunctionUsageTab() {
  const [days, setDays] = useState(7);
  const { data: usage, isLoading } = useEdgeFunctionUsageSummary(days);

  const exportCSV = () => {
    if (!usage) return;
    const rows = usage.topFunctions.map(f =>
      `${f.function_name},${f.total},${f.successes},${f.errors},${f.avgResponseTime},${f.successRate},${f.totalTokens}`
    );
    const csv = `Function,Total,Successes,Errors,Avg Response Time (ms),Success Rate (%),Tokens Used\n${rows.join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `edge-function-usage-${days}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {DATE_RANGES.map(range => (
            <Button
              key={range.days}
              variant={days === range.days ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDays(range.days)}
            >
              <Calendar className="h-3.5 w-3.5 mr-1" />
              {range.label}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={!usage}>
          <Download className="h-4 w-4 mr-1" />
          Export CSV
        </Button>
      </div>

      {/* Daily Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invocations Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          {usage && usage.dailyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={usage.dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 10 }} />
                <YAxis className="text-xs" />
                <Tooltip />
                <Area type="monotone" dataKey="invocations" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} name="Invocations" />
                <Area type="monotone" dataKey="errors" stroke="hsl(0, 65%, 55%)" fill="hsl(0, 65%, 55%)" fillOpacity={0.1} name="Errors" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {isLoading ? 'Loading...' : 'No data for selected period'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Per-Function Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-Function Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card border-b">
                <tr className="text-left text-muted-foreground">
                  <th className="p-3 font-medium">Function</th>
                  <th className="p-3 font-medium text-right">Invocations</th>
                  <th className="p-3 font-medium text-right hidden md:table-cell">Successes</th>
                  <th className="p-3 font-medium text-right hidden md:table-cell">Errors</th>
                  <th className="p-3 font-medium text-right">Success Rate</th>
                  <th className="p-3 font-medium text-right hidden lg:table-cell">Avg Time</th>
                  <th className="p-3 font-medium text-right hidden lg:table-cell">Tokens</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : !usage?.topFunctions.length ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No usage data</td></tr>
                ) : (
                  usage.topFunctions.map(fn => (
                    <tr key={fn.function_name} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-mono text-xs">{fn.function_name}</td>
                      <td className="p-3 text-right font-mono text-xs">{fn.total.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono text-xs hidden md:table-cell text-green-500">{fn.successes}</td>
                      <td className="p-3 text-right font-mono text-xs hidden md:table-cell text-red-500">{fn.errors}</td>
                      <td className="p-3 text-right">
                        <Badge variant={fn.successRate >= 95 ? 'default' : fn.successRate >= 80 ? 'secondary' : 'destructive'} className="text-xs">
                          {fn.successRate}%
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-mono text-xs hidden lg:table-cell">{fn.avgResponseTime}ms</td>
                      <td className="p-3 text-right font-mono text-xs hidden lg:table-cell">{fn.totalTokens.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
