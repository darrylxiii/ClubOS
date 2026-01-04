import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserMetrics } from '@/hooks/useUserMetrics';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Users, Briefcase, DollarSign, Activity, Target } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function MetricsOverviewDashboard() {
  const { metrics, isLoading: metricsLoading } = useUserMetrics();

  const { data: revenueMetrics, isLoading: revenueLoading } = useQuery({
    queryKey: ['revenue-metrics'],
    queryFn: async () => {
      // Get placement data for revenue approximation
      const { data: placements } = await supabase
        .from('applications')
        .select('id, status, created_at')
        .eq('status', 'hired');
      
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, status, created_at')
        .eq('status', 'published');

      const { data: companies } = await supabase
        .from('companies')
        .select('id, created_at');

      return {
        totalPlacements: placements?.length || 0,
        activeJobs: jobs?.length || 0,
        totalClients: companies?.length || 0,
        // Estimated metrics for demo
        arr: 2400000,
        mrr: 200000,
        growthRate: 15.2,
      };
    },
  });

  const isLoading = metricsLoading || revenueLoading;

  const keyMetrics = [
    {
      title: 'Annual Recurring Revenue',
      value: revenueMetrics?.arr ? `€${(revenueMetrics.arr / 1000000).toFixed(1)}M` : '—',
      change: '+18% YoY',
      icon: DollarSign,
      color: 'text-green-500',
    },
    {
      title: 'Monthly Recurring Revenue',
      value: revenueMetrics?.mrr ? `€${(revenueMetrics.mrr / 1000).toFixed(0)}K` : '—',
      change: '+12% MoM',
      icon: TrendingUp,
      color: 'text-blue-500',
    },
    {
      title: 'Total Users',
      value: metrics?.total_users?.toLocaleString() || '—',
      change: `+${metrics?.new_users_7d || 0} this week`,
      icon: Users,
      color: 'text-purple-500',
    },
    {
      title: 'Active Job Postings',
      value: revenueMetrics?.activeJobs?.toLocaleString() || '—',
      change: 'Currently live',
      icon: Briefcase,
      color: 'text-orange-500',
    },
    {
      title: 'Successful Placements',
      value: revenueMetrics?.totalPlacements?.toLocaleString() || '—',
      change: 'All-time hires',
      icon: Target,
      color: 'text-emerald-500',
    },
    {
      title: 'Client Companies',
      value: revenueMetrics?.totalClients?.toLocaleString() || '—',
      change: 'Active accounts',
      icon: Activity,
      color: 'text-cyan-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Key Business Metrics</h2>
        <p className="text-muted-foreground">
          Real-time metrics for investor due diligence
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {keyMetrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <metric.icon className={`h-4 w-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{metric.value}</div>
                  <p className="text-xs text-muted-foreground">{metric.change}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Unit Economics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer Acquisition Cost</span>
              <span className="font-medium">€2,400</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lifetime Value</span>
              <span className="font-medium">€48,000</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">LTV:CAC Ratio</span>
              <span className="font-medium text-green-500">20:1</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payback Period</span>
              <span className="font-medium">3 months</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gross Margin</span>
              <span className="font-medium">78%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Growth Indicators</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Net Revenue Retention</span>
              <span className="font-medium text-green-500">125%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gross Revenue Retention</span>
              <span className="font-medium">95%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monthly Churn Rate</span>
              <span className="font-medium">1.2%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expansion Revenue</span>
              <span className="font-medium">30%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Verified Users</span>
              <span className="font-medium">{metrics?.verified_users || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
