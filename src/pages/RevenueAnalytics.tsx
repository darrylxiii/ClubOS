import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, TrendingDown, DollarSign, Users, Target, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatDistanceToNow } from "date-fns";

export default function RevenueAnalytics() {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "1y">("30d");

  const { data: currentMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['current-revenue-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('revenue_metrics')
        .select('*')
        .order('metric_date', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: historicalMetrics, isLoading: historyLoading } = useQuery({
    queryKey: ['historical-revenue-metrics', timeRange],
    queryFn: async () => {
      const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 365;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('revenue_metrics')
        .select('*')
        .gte('metric_date', startDate.toISOString().split('T')[0])
        .order('metric_date', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const { data: subscriptionBreakdown } = useQuery({
    queryKey: ['subscription-breakdown'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          subscription_plans(name, tier, price_euros)
        `)
        .eq('status', 'active');

      if (error) throw error;

      const breakdown = data.reduce((acc: any, sub: any) => {
        const tier = sub.subscription_plans.tier;
        if (!acc[tier]) {
          acc[tier] = { count: 0, revenue: 0 };
        }
        acc[tier].count += 1;
        acc[tier].revenue += sub.subscription_plans.price_euros;
        return acc;
      }, {});

      return Object.entries(breakdown).map(([tier, data]: [string, any]) => ({
        tier,
        count: data.count,
        revenue: data.revenue,
      }));
    },
  });

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
    }).format(cents / 100);
  };

  const formatMetric = (value: number, type: 'currency' | 'percentage' | 'number') => {
    if (type === 'currency') return formatCurrency(value);
    if (type === 'percentage') return `${value.toFixed(2)}%`;
    return value.toLocaleString();
  };

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  if (metricsLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const mrr = currentMetrics?.mrr || 0;
  const arr = currentMetrics?.arr || 0;
  const activeSubscriptions = currentMetrics?.active_subscriptions || 0;
  const churnRate = currentMetrics?.churn_rate || 0;
  const arpu = currentMetrics?.average_revenue_per_user || 0;
  const nrr = currentMetrics?.net_revenue_retention || 100;

  return (
    <AppLayout>
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Revenue Analytics</h1>
          <p className="text-muted-foreground">Track subscription metrics, revenue growth, and customer insights</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
                <DollarSign className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatCurrency(mrr)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                ARR: {formatCurrency(arr)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
                <Users className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{activeSubscriptions}</div>
              <p className="text-xs text-muted-foreground mt-1">
                ARPU: {formatCurrency(arpu)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
                <Target className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{churnRate.toFixed(2)}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                NRR: {nrr.toFixed(0)}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">New MRR</span>
                <ArrowUpRight className="w-4 h-4 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(currentMetrics?.new_mrr || 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Expansion MRR</span>
                <ArrowUpRight className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(currentMetrics?.expansion_mrr || 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Contraction MRR</span>
                <ArrowDownRight className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-amber-600">
                {formatCurrency(currentMetrics?.contraction_mrr || 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Churn MRR</span>
                <ArrowDownRight className="w-4 h-4 text-red-500" />
              </div>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(currentMetrics?.churn_mrr || 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)} className="mb-8">
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="7d">7 Days</TabsTrigger>
            <TabsTrigger value="30d">30 Days</TabsTrigger>
            <TabsTrigger value="90d">90 Days</TabsTrigger>
            <TabsTrigger value="1y">1 Year</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>MRR Growth</CardTitle>
              <CardDescription>Monthly recurring revenue over time</CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={historicalMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="metric_date" tickFormatter={(date) => new Date(date).toLocaleDateString('en-EU', { month: 'short', day: 'numeric' })} />
                    <YAxis tickFormatter={(value) => `€${(value / 100).toFixed(0)}`} />
                    <Tooltip formatter={(value: any) => formatCurrency(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="mrr" stroke="#8b5cf6" name="MRR" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Subscription Breakdown</CardTitle>
              <CardDescription>Active subscriptions by tier</CardDescription>
            </CardHeader>
            <CardContent>
              {!subscriptionBreakdown ? (
                <div className="flex items-center justify-center h-[300px]">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={subscriptionBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="tier" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#8b5cf6" name="Subscriptions" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
