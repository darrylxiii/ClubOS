import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEdgeFunctionRegistry, useToggleEdgeFunction } from '@/hooks/useEdgeFunctionRegistry';
import { DollarSign, TrendingDown, AlertTriangle, PowerOff } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ScrollArea } from '@/components/ui/scroll-area';

const COLORS = [
  'hsl(0, 65%, 55%)', 'hsl(30, 80%, 55%)', 'hsl(210, 70%, 55%)',
  'hsl(150, 60%, 45%)', 'hsl(280, 60%, 55%)', 'hsl(180, 55%, 45%)',
  'hsl(60, 70%, 45%)', 'hsl(330, 60%, 55%)',
];

export function EdgeFunctionCostTab() {
  const { data: functions = [], isLoading } = useEdgeFunctionRegistry();
  const toggleFn = useToggleEdgeFunction();

  // Calculate cost per function (daily estimate based on invocation_count / 30)
  const costData = functions
    .map(fn => {
      const dailyInvocations = (fn.invocation_count || 0) / 30;
      const apiCost = dailyInvocations * (Number(fn.external_api_cost_per_call) || 0);
      const computeCost = dailyInvocations * (Number(fn.compute_cost_estimate_per_call) || 0);
      const totalDaily = apiCost + computeCost;
      return {
        ...fn,
        dailyInvocations: Math.round(dailyInvocations),
        apiCost,
        computeCost,
        totalDaily,
        monthlyEstimate: totalDaily * 30,
      };
    })
    .sort((a, b) => b.totalDaily - a.totalDaily);

  const totalDailyCost = costData.reduce((s, c) => s + c.totalDaily, 0);
  const totalMonthlyCost = totalDailyCost * 30;
  const topCostFunctions = costData.filter(c => c.totalDaily > 0).slice(0, 15);

  // By tag
  const byTag: Record<string, number> = {};
  costData.forEach(fn => {
    (fn.tags || []).forEach(tag => {
      byTag[tag] = (byTag[tag] || 0) + fn.totalDaily;
    });
  });
  const tagData = Object.entries(byTag)
    .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
    .sort((a, b) => b.value - a.value);

  // Low-ROI: active functions costing money but with high error rates
  const lowRoi = costData.filter(c => c.is_active !== false && c.totalDaily > 0.01 && Number(c.error_rate) > 10);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Est. Daily Cost</p>
                <p className="text-2xl font-bold">${totalDailyCost.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <TrendingDown className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Est. Monthly Cost</p>
                <p className="text-2xl font-bold">${totalMonthlyCost.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Low-ROI Functions</p>
                <p className="text-2xl font-bold">{lowRoi.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost by Service Tag */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cost by Service Tag</CardTitle>
          </CardHeader>
          <CardContent>
            {tagData.length > 0 ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie data={tagData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                      {tagData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: number) => `$${val.toFixed(2)}/day`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {tagData.map((t, i) => (
                    <div key={t.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-muted-foreground">{t.name}</span>
                      </div>
                      <span className="font-mono text-xs">${t.value}/day</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No cost tags configured. Add tags and cost estimates in the Registry tab.</p>
            )}
          </CardContent>
        </Card>

        {/* Low-ROI Functions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Low-ROI Functions (Cost + High Errors)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowRoi.length > 0 ? (
              <div className="space-y-2">
                {lowRoi.slice(0, 8).map(fn => (
                  <div key={fn.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                    <div>
                      <span className="font-medium">{fn.display_name || fn.function_name}</span>
                      <div className="flex gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">${fn.totalDaily.toFixed(3)}/day</span>
                        <span className="text-xs text-red-500">{Number(fn.error_rate).toFixed(1)}% errors</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toggleFn.mutate({ id: fn.id, isActive: false })}>
                      <PowerOff className="h-3 w-3 mr-1" /> Disable
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No low-ROI functions detected.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Cost Functions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Cost Functions (Daily Estimate)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card border-b">
                <tr className="text-left text-muted-foreground">
                  <th className="p-3 font-medium">Function</th>
                  <th className="p-3 font-medium hidden md:table-cell">Tags</th>
                  <th className="p-3 font-medium text-right">Daily Calls</th>
                  <th className="p-3 font-medium text-right">API Cost</th>
                  <th className="p-3 font-medium text-right">Compute</th>
                  <th className="p-3 font-medium text-right">Total/Day</th>
                  <th className="p-3 font-medium text-right">Monthly</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : topCostFunctions.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No cost data. Configure cost estimates in the Registry.</td></tr>
                ) : (
                  topCostFunctions.map(fn => (
                    <tr key={fn.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        <p className="font-medium">{fn.display_name || fn.function_name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{fn.function_name}</p>
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        <div className="flex gap-1 flex-wrap">
                          {(fn.tags || []).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono text-xs">{fn.dailyInvocations.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono text-xs">${fn.apiCost.toFixed(3)}</td>
                      <td className="p-3 text-right font-mono text-xs">${fn.computeCost.toFixed(3)}</td>
                      <td className="p-3 text-right font-mono text-xs font-medium">${fn.totalDaily.toFixed(3)}</td>
                      <td className="p-3 text-right font-mono text-xs">${fn.monthlyEstimate.toFixed(2)}</td>
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
