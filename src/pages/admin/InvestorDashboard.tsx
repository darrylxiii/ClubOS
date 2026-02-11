import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Loader2, TrendingUp, TrendingDown, DollarSign, Users, Target, 
  Download, Calendar, ArrowUpRight, ArrowDownRight, Percent,
  BarChart3, PieChart, Activity
} from "lucide-react";
// Recharts removed - charts are in sub-components that lazy load
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ARRChart } from "@/components/investor/ARRChart";
import { CohortAnalysis } from "@/components/investor/CohortAnalysis";
import { UnitEconomics } from "@/components/investor/UnitEconomics";
import { InvestorReportExport } from "@/components/investor/InvestorReportExport";

export default function InvestorDashboard() {
  const [timeRange, setTimeRange] = useState<"3m" | "6m" | "12m" | "all">("12m");

  const { data: currentMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['investor-current-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('revenue_metrics')
        .select('*')
        .order('metric_date', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  const { data: historicalMetrics, isLoading: historyLoading } = useQuery({
    queryKey: ['investor-historical-metrics', timeRange],
    queryFn: async () => {
      const months = timeRange === "3m" ? 3 : timeRange === "6m" ? 6 : timeRange === "12m" ? 12 : 36;
      const startDate = subMonths(new Date(), months);

      const { data, error } = await supabase
        .from('revenue_metrics')
        .select('*')
        .gte('metric_date', startDate.toISOString().split('T')[0])
        .order('metric_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const { data: subscriptionStats } = useQuery({
    queryKey: ['investor-subscription-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          status,
          subscription_plans(tier, price_euros)
        `);

      if (error) throw error;
      
      const stats = {
        active: 0,
        trialing: 0,
        churned: 0,
        byTier: {} as Record<string, { count: number; mrr: number }>,
      };

      data?.forEach((sub: any) => {
        if (sub.status === 'active') stats.active++;
        else if (sub.status === 'trialing') stats.trialing++;
        else if (sub.status === 'canceled') stats.churned++;

        const tier = sub.subscription_plans?.tier || 'unknown';
        if (!stats.byTier[tier]) {
          stats.byTier[tier] = { count: 0, mrr: 0 };
        }
        if (sub.status === 'active') {
          stats.byTier[tier].count++;
          stats.byTier[tier].mrr += (sub.subscription_plans?.price_euros || 0) * 100;
        }
      });

      return stats;
    },
  });

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  const formatGrowth = (current: number, previous: number) => {
    if (!previous) return null;
    const growth = ((current - previous) / previous) * 100;
    return growth;
  };

  // Calculate key investor metrics
  const mrr = currentMetrics?.mrr || 0;
  const arr = currentMetrics?.arr || 0;
  const activeSubscriptions = currentMetrics?.active_subscriptions || 0;
  const churnRate = currentMetrics?.churn_rate || 0;
  const arpu = currentMetrics?.average_revenue_per_user || 0;
  const ltv = currentMetrics?.customer_lifetime_value || 0;
  const nrr = currentMetrics?.net_revenue_retention || 100;

  // Calculate LTV/CAC (simplified - CAC would come from marketing spend)
  const estimatedCAC = arpu * 3; // Placeholder: 3 months ARPU as CAC
  const ltvCacRatio = estimatedCAC > 0 ? ltv / estimatedCAC : 0;
  const cacPaybackMonths = arpu > 0 ? estimatedCAC / arpu : 0;

  // Quick Ratio = (New MRR + Expansion) / (Churn + Contraction)
  const newMrr = currentMetrics?.new_mrr || 0;
  const expansionMrr = currentMetrics?.expansion_mrr || 0;
  const churnMrr = currentMetrics?.churn_mrr || 0;
  const contractionMrr = currentMetrics?.contraction_mrr || 0;
  const quickRatio = (churnMrr + contractionMrr) > 0 
    ? (newMrr + expansionMrr) / (churnMrr + contractionMrr) 
    : newMrr + expansionMrr > 0 ? Infinity : 0;

  // Growth rate calculation
  const previousMonthMetrics = historicalMetrics?.slice(-2)?.[0];
  const mrrGrowth = previousMonthMetrics ? formatGrowth(mrr, previousMonthMetrics.mrr) : null;

  if (metricsLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-7xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Investor Dashboard</h1>
            <p className="text-muted-foreground">Real-time SaaS metrics for The Quantum Club</p>
          </div>
          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <InvestorReportExport metrics={currentMetrics} historicalData={historicalMetrics} />
          </div>
        </div>

        {/* Executive Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                ARR
                <DollarSign className="w-4 h-4 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatCurrency(arr)}</div>
              {mrrGrowth !== null && (
                <div className={`flex items-center text-sm mt-1 ${mrrGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {mrrGrowth >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  <span>{Math.abs(mrrGrowth).toFixed(1)}% MoM</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">MRR: {formatCurrency(mrr)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                LTV/CAC Ratio
                <Target className="w-4 h-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {ltvCacRatio === Infinity ? '∞' : ltvCacRatio.toFixed(1)}x
              </div>
              <p className={`text-xs mt-1 ${ltvCacRatio >= 3 ? 'text-green-600' : ltvCacRatio >= 1 ? 'text-amber-600' : 'text-red-600'}`}>
                {ltvCacRatio >= 3 ? 'Healthy' : ltvCacRatio >= 1 ? 'Acceptable' : 'Needs improvement'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Payback: {cacPaybackMonths.toFixed(1)} months
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                Net Revenue Retention
                <Percent className="w-4 h-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{nrr.toFixed(0)}%</div>
              <p className={`text-xs mt-1 ${nrr >= 120 ? 'text-green-600' : nrr >= 100 ? 'text-amber-600' : 'text-red-600'}`}>
                {nrr >= 120 ? 'Excellent' : nrr >= 100 ? 'Good' : 'At risk'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Churn: {churnRate.toFixed(2)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                Quick Ratio
                <Activity className="w-4 h-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {quickRatio === Infinity ? '∞' : quickRatio.toFixed(1)}
              </div>
              <p className={`text-xs mt-1 ${quickRatio >= 4 ? 'text-green-600' : quickRatio >= 1 ? 'text-amber-600' : 'text-red-600'}`}>
                {quickRatio >= 4 ? 'Strong growth' : quickRatio >= 1 ? 'Stable' : 'Contracting'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {activeSubscriptions} active customers
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Time Range Selector */}
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)} className="mb-6">
          <TabsList>
            <TabsTrigger value="3m">3 Months</TabsTrigger>
            <TabsTrigger value="6m">6 Months</TabsTrigger>
            <TabsTrigger value="12m">12 Months</TabsTrigger>
            <TabsTrigger value="all">All Time</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* ARR Growth Chart */}
        <ARRChart data={historicalMetrics} isLoading={historyLoading} />

        {/* Unit Economics & Cohort Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <UnitEconomics 
            ltv={ltv}
            cac={estimatedCAC}
            arpu={arpu}
            churnRate={churnRate}
          />
          <CohortAnalysis />
        </div>

        {/* MRR Movement */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              MRR Movement
            </CardTitle>
            <CardDescription>New vs Churned revenue breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="text-sm text-muted-foreground mb-1">New MRR</div>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(newMrr)}</div>
              </div>
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="text-sm text-muted-foreground mb-1">Expansion</div>
                <div className="text-2xl font-bold text-blue-600">{formatCurrency(expansionMrr)}</div>
              </div>
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="text-sm text-muted-foreground mb-1">Contraction</div>
                <div className="text-2xl font-bold text-amber-600">-{formatCurrency(contractionMrr)}</div>
              </div>
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="text-sm text-muted-foreground mb-1">Churned</div>
                <div className="text-2xl font-bold text-red-600">-{formatCurrency(churnMrr)}</div>
              </div>
            </div>
            <div className="mt-4 p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Net MRR Change</span>
                <span className={`text-lg font-bold ${(newMrr + expansionMrr - churnMrr - contractionMrr) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(newMrr + expansionMrr - churnMrr - contractionMrr)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tier Breakdown */}
        {subscriptionStats && Object.keys(subscriptionStats.byTier).length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Revenue by Tier
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(subscriptionStats.byTier).map(([tier, data]) => (
                  <div key={tier} className="p-4 rounded-lg border">
                    <div className="text-sm text-muted-foreground capitalize">{tier}</div>
                    <div className="text-2xl font-bold">{formatCurrency(data.mrr)}</div>
                    <div className="text-xs text-muted-foreground">{data.count} customers</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
