import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
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
    rlsPolicies: item.total_rls_policies,
    failedAuth: item.failed_auth_attempts,
    rateLimits: item.rate_limit_rejections,
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
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="failedAuth" 
              stroke="#ef4444" 
              strokeWidth={2}
              name="Failed Auth"
              dot={{ fill: '#ef4444', r: 3 }}
            />
            <Line 
              type="monotone" 
              dataKey="rateLimits" 
              stroke="#f97316" 
              strokeWidth={2}
              name="Rate Limits"
              dot={{ fill: '#f97316', r: 3 }}
            />
            <Line 
              type="monotone" 
              dataKey="rlsPolicies" 
              stroke="#3b82f6" 
              strokeWidth={2}
              name="RLS Policies"
              dot={{ fill: '#3b82f6', r: 3 }}
            />
            <Line 
              type="monotone" 
              dataKey="coverage" 
              stroke="#22c55e" 
              strokeWidth={2}
              name="Coverage %"
              dot={{ fill: '#22c55e', r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
