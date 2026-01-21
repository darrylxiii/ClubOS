import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DynamicChart } from "@/components/charts/DynamicChart";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import type { SecurityMetricsHistory } from "@/types/security";

export const SecurityTrendsChart = () => {
  const { data: trendsData, isLoading } = useQuery({
    queryKey: ['security-trends'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_metrics_history')
        .select('*')
        .order('metric_date', { ascending: true })
        .limit(30);
      
      if (error) throw error;
      return data as SecurityMetricsHistory[];
    },
    refetchInterval: 300000 // 5 minutes
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!trendsData || trendsData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>30-Day Security Trends</CardTitle>
          <CardDescription>Historical security metrics over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            No historical data available yet. Metrics are collected daily.
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = trendsData.map(item => ({
    date: format(new Date(item.metric_date), 'MMM dd'),
    failedAuth: item.failed_auth_attempts,
    rateLimits: item.rate_limit_rejections,
    rlsPolicies: item.total_rls_policies,
    coverage: item.total_tables > 0 
      ? Math.round((item.tables_with_rls / item.total_tables) * 100)
      : 0
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>30-Day Security Trends</CardTitle>
        <CardDescription>Historical security metrics and patterns</CardDescription>
      </CardHeader>
      <CardContent>
        <DynamicChart
          type="line"
          data={chartData}
          height={400}
          config={{
            lines: [
              { dataKey: 'failedAuth', stroke: '#ef4444', strokeWidth: 2, name: 'Failed Auth' },
              { dataKey: 'rateLimits', stroke: '#f97316', strokeWidth: 2, name: 'Rate Limits' },
              { dataKey: 'rlsPolicies', stroke: '#3b82f6', strokeWidth: 2, name: 'RLS Policies' },
              { dataKey: 'coverage', stroke: '#22c55e', strokeWidth: 2, name: 'Coverage %' },
            ],
            xAxisDataKey: 'date',
            showGrid: true,
            showTooltip: true,
            legend: true,
          }}
        />
      </CardContent>
    </Card>
  );
};
