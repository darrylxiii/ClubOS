import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMetricValue, checkThreshold } from "@/utils/performanceBaselines";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Gauge,
  Zap
} from "lucide-react";
import { format, subDays, subHours } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface MetricSummary {
  metric_type: string;
  avg_value: number;
  min_value: number;
  max_value: number;
  p95_value: number;
  count: number;
}

interface ViolationSummary {
  severity: string;
  count: number;
}

export function PerformanceDashboard() {
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('24h');

  const getTimeRangeStart = () => {
    switch (timeRange) {
      case '1h': return subHours(new Date(), 1);
      case '24h': return subDays(new Date(), 1);
      case '7d': return subDays(new Date(), 7);
    }
  };

  // Fetch metric summaries
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['performance-metrics-summary', timeRange],
    queryFn: async () => {
      const startDate = getTimeRangeStart().toISOString();
      
      const { data, error } = await supabase
        .from('performance_metrics' as any)
        .select('metric_type, value')
        .gte('recorded_at', startDate)
        .order('recorded_at', { ascending: false });

      if (error) throw error;

      // Group and calculate statistics
      const rawData = (data as unknown) as { metric_type: string; value: number }[];
      const grouped = rawData.reduce((acc, row) => {
        if (!acc[row.metric_type]) {
          acc[row.metric_type] = [];
        }
        acc[row.metric_type].push(row.value);
        return acc;
      }, {} as Record<string, number[]>);

      return Object.entries(grouped).map(([metric_type, values]) => {
        const sorted = [...values].sort((a, b) => a - b);
        const p95Index = Math.floor(sorted.length * 0.95);
        
        return {
          metric_type,
          avg_value: values.reduce((a, b) => a + b, 0) / values.length,
          min_value: Math.min(...values),
          max_value: Math.max(...values),
          p95_value: sorted[p95Index] || sorted[sorted.length - 1],
          count: values.length,
        } as MetricSummary;
      });
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch violation counts
  const { data: violations, isLoading: violationsLoading } = useQuery({
    queryKey: ['sla-violations-summary', timeRange],
    queryFn: async () => {
      const startDate = getTimeRangeStart().toISOString();
      
      const { data, error } = await supabase
        .from('sla_violations' as any)
        .select('severity')
        .gte('detected_at', startDate);

      if (error) throw error;

      const counts = (data as any[]).reduce((acc, row) => {
        acc[row.severity] = (acc[row.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return [
        { severity: 'warning', count: counts['warning'] || 0 },
        { severity: 'critical', count: counts['critical'] || 0 },
      ] as ViolationSummary[];
    },
    refetchInterval: 60000,
  });

  // Fetch recent metrics for chart
  const { data: chartData } = useQuery({
    queryKey: ['performance-metrics-chart', timeRange],
    queryFn: async () => {
      const startDate = getTimeRangeStart().toISOString();
      
      const { data, error } = await supabase
        .from('performance_metrics' as any)
        .select('metric_type, value, recorded_at')
        .in('metric_type', ['lcp', 'fid', 'cls', 'ttfb'])
        .gte('recorded_at', startDate)
        .order('recorded_at', { ascending: true });

      if (error) throw error;

      // Group by time buckets
      const bucketSize = timeRange === '1h' ? 5 : timeRange === '24h' ? 60 : 360; // minutes
      const buckets = new Map<string, Record<string, number[]>>();

      (data as any[]).forEach((row) => {
        const date = new Date(row.recorded_at);
        const bucketTime = new Date(
          Math.floor(date.getTime() / (bucketSize * 60000)) * (bucketSize * 60000)
        );
        const key = bucketTime.toISOString();

        if (!buckets.has(key)) {
          buckets.set(key, {});
        }
        const bucket = buckets.get(key)!;
        if (!bucket[row.metric_type]) {
          bucket[row.metric_type] = [];
        }
        bucket[row.metric_type].push(row.value);
      });

      return Array.from(buckets.entries()).map(([time, metrics]) => ({
        time: format(new Date(time), timeRange === '7d' ? 'MMM d' : 'HH:mm'),
        lcp: metrics['lcp'] ? metrics['lcp'].reduce((a, b) => a + b, 0) / metrics['lcp'].length : null,
        fid: metrics['fid'] ? metrics['fid'].reduce((a, b) => a + b, 0) / metrics['fid'].length : null,
        cls: metrics['cls'] ? metrics['cls'].reduce((a, b) => a + b, 0) / metrics['cls'].length : null,
        ttfb: metrics['ttfb'] ? metrics['ttfb'].reduce((a, b) => a + b, 0) / metrics['ttfb'].length : null,
      }));
    },
    refetchInterval: 60000,
  });

  const getStatusBadge = (metricType: string, value: number) => {
    const key = metricType.toUpperCase().replace(/-/g, '_');
    const status = checkThreshold(key, value);
    
    if (status === 'good') {
      return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle2 className="w-3 h-3 mr-1" />Good</Badge>;
    } else if (status === 'warning') {
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"><AlertTriangle className="w-3 h-3 mr-1" />Warning</Badge>;
    } else if (status === 'critical') {
      return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Critical</Badge>;
    }
    return <Badge variant="secondary">Unknown</Badge>;
  };

  const warningCount = violations?.find(v => v.severity === 'warning')?.count || 0;
  const criticalCount = violations?.find(v => v.severity === 'critical')?.count || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Monitoring</h2>
          <p className="text-muted-foreground">Real-time performance metrics and SLA compliance</p>
        </div>
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
          <TabsList>
            <TabsTrigger value="1h">1 Hour</TabsTrigger>
            <TabsTrigger value="24h">24 Hours</TabsTrigger>
            <TabsTrigger value="7d">7 Days</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary" />
              Total Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">
                {metrics?.reduce((sum, m) => sum + m.count, 0).toLocaleString() || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {violationsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-yellow-500">{warningCount}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Critical
            </CardTitle>
          </CardHeader>
          <CardContent>
            {violationsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-destructive">{criticalCount}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-green-500" />
              SLA Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metricsLoading || violationsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-green-500">
                {metrics && metrics.reduce((sum, m) => sum + m.count, 0) > 0
                  ? Math.round(
                      ((metrics.reduce((sum, m) => sum + m.count, 0) - warningCount - criticalCount) /
                        metrics.reduce((sum, m) => sum + m.count, 0)) *
                        100
                    )
                  : 100}
                %
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Core Web Vitals Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Core Web Vitals Trend</CardTitle>
          <CardDescription>LCP, FID, CLS, and TTFB over time</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData && chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="time" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line type="monotone" dataKey="lcp" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="LCP (ms)" />
                <Line type="monotone" dataKey="ttfb" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} name="TTFB (ms)" />
                <Line type="monotone" dataKey="fid" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} name="FID (ms)" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No data available for the selected time range
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Metric Details</CardTitle>
          <CardDescription>Detailed statistics for each metric type</CardDescription>
        </CardHeader>
        <CardContent>
          {metricsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : metrics && metrics.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">Metric</th>
                    <th className="text-right py-3 px-2 font-medium">Avg</th>
                    <th className="text-right py-3 px-2 font-medium">P95</th>
                    <th className="text-right py-3 px-2 font-medium">Min</th>
                    <th className="text-right py-3 px-2 font-medium">Max</th>
                    <th className="text-right py-3 px-2 font-medium">Samples</th>
                    <th className="text-center py-3 px-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((metric) => (
                    <tr key={metric.metric_type} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2 font-medium">{metric.metric_type.toUpperCase()}</td>
                      <td className="text-right py-3 px-2">{formatMetricValue(metric.metric_type, metric.avg_value)}</td>
                      <td className="text-right py-3 px-2">{formatMetricValue(metric.metric_type, metric.p95_value)}</td>
                      <td className="text-right py-3 px-2 text-muted-foreground">{formatMetricValue(metric.metric_type, metric.min_value)}</td>
                      <td className="text-right py-3 px-2 text-muted-foreground">{formatMetricValue(metric.metric_type, metric.max_value)}</td>
                      <td className="text-right py-3 px-2">{metric.count.toLocaleString()}</td>
                      <td className="text-center py-3 px-2">{getStatusBadge(metric.metric_type, metric.avg_value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No metrics recorded yet. Performance data will appear as users interact with the app.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
