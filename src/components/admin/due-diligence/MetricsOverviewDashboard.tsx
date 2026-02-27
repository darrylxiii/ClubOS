import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserMetrics } from '@/hooks/useUserMetrics';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Users, Briefcase, DollarSign, Activity, Target } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { grossToNet } from '@/lib/vatRates';

export function MetricsOverviewDashboard() {
  const { metrics, isLoading: metricsLoading } = useUserMetrics();

  const { data: liveMetrics, isLoading: revenueLoading } = useQuery({
    queryKey: ['dd-live-metrics'],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();
      const prevYear = currentYear - 1;
      const monthsElapsed = new Date().getMonth() + 1;

      // Current year net revenue
      const { data: curInv } = await supabase
        .from('moneybird_sales_invoices')
        .select('total_amount, net_amount, contact_id, invoice_date')
        .gte('invoice_date', `${currentYear}-01-01`)
        .lt('invoice_date', `${currentYear + 1}-01-01`);

      const curNetRevenue = (curInv || []).reduce(
        (s, i) => s + (Number(i.net_amount) || grossToNet(Number(i.total_amount) || 0)),
        0,
      );

      // Previous year net revenue
      const { data: prevInv } = await supabase
        .from('moneybird_sales_invoices')
        .select('total_amount, net_amount')
        .gte('invoice_date', `${prevYear}-01-01`)
        .lt('invoice_date', `${prevYear + 1}-01-01`);

      const prevNetRevenue = (prevInv || []).reduce(
        (s, i) => s + (Number(i.net_amount) || grossToNet(Number(i.total_amount) || 0)),
        0,
      );

      // ARR = annualize current year
      const arr = monthsElapsed > 0 ? (curNetRevenue / monthsElapsed) * 12 : 0;
      const mrr = arr / 12;
      const growthRate = prevNetRevenue > 0 ? ((curNetRevenue / prevNetRevenue - 1) * 100) : 0;

      // Active unique clients this year
      const uniqueClients = new Set((curInv || []).map((i) => i.contact_id).filter(Boolean));

      // Placement & job counts
      const { count: placements } = await supabase
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'hired');

      const { count: activeJobs } = await supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published');

      // Commissions + payouts for unit economics
      const { data: comms } = await supabase
        .from('employee_commissions')
        .select('gross_amount')
        .gte('created_at', `${currentYear}-01-01`);
      const totalCommissions = (comms || []).reduce((s, c) => s + (c.gross_amount || 0), 0);

      const { data: pays } = await supabase
        .from('referral_payouts')
        .select('payout_amount')
        .gte('created_at', `${currentYear}-01-01`);
      const totalPayouts = (pays || []).reduce((s, p) => s + (p.payout_amount || 0), 0);

      // Operating expenses for CAC proxy
      const { data: exps } = await supabase
        .from('operating_expenses')
        .select('amount_eur, amount')
        .gte('expense_date', `${currentYear}-01-01`);
      const totalOpex = (exps || []).reduce((s, e) => s + (Number(e.amount_eur ?? e.amount) || 0), 0);

      const grossMargin = curNetRevenue > 0 ? ((curNetRevenue - totalCommissions - totalPayouts) / curNetRevenue) * 100 : 0;
      const clientCount = uniqueClients.size;
      const cac = clientCount > 0 ? totalOpex / clientCount : 0;
      const avgRevenuePerClient = clientCount > 0 ? curNetRevenue / clientCount : 0;

      // Compute previous year unique clients for NRR proxy
      const prevClients = new Set((prevInv || []).map((i: any) => i.contact_id).filter(Boolean));

      return {
        arr,
        mrr,
        growthRate,
        totalPlacements: placements || 0,
        activeJobs: activeJobs || 0,
        totalClients: clientCount,
        netRevenue: curNetRevenue,
        cac,
        avgRevenuePerClient,
        grossMargin,
        prevClients: prevClients.size,
        prevNetRevenue,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = metricsLoading || revenueLoading;

  const fmtEur = (v: number) => {
    if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `€${(v / 1_000).toFixed(0)}K`;
    return `€${v.toFixed(0)}`;
  };

  const keyMetrics = [
    {
      title: 'Annual Recurring Revenue',
      value: liveMetrics ? fmtEur(liveMetrics.arr) : '—',
      change: liveMetrics ? `${liveMetrics.growthRate >= 0 ? '+' : ''}${liveMetrics.growthRate.toFixed(1)}% YoY` : '—',
      icon: DollarSign,
      color: 'text-primary',
    },
    {
      title: 'Monthly Recurring Revenue',
      value: liveMetrics ? fmtEur(liveMetrics.mrr) : '—',
      change: `Annualized from YTD`,
      icon: TrendingUp,
      color: 'text-primary',
    },
    {
      title: 'Total Users',
      value: metrics?.total_users?.toLocaleString() || '—',
      change: `+${metrics?.new_users_7d || 0} this week`,
      icon: Users,
      color: 'text-primary',
    },
    {
      title: 'Active Job Postings',
      value: liveMetrics?.activeJobs?.toLocaleString() || '—',
      change: 'Currently live',
      icon: Briefcase,
      color: 'text-primary',
    },
    {
      title: 'Successful Placements',
      value: liveMetrics?.totalPlacements?.toLocaleString() || '—',
      change: 'All-time hires',
      icon: Target,
      color: 'text-primary',
    },
    {
      title: 'Active Clients',
      value: liveMetrics?.totalClients?.toLocaleString() || '—',
      change: 'Invoiced this year',
      icon: Activity,
      color: 'text-primary',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Key Business Metrics</h2>
        <p className="text-muted-foreground">
          Live metrics computed from financial records
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
              <span className="font-medium">{liveMetrics ? fmtEur(liveMetrics.cac) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg Revenue per Client</span>
              <span className="font-medium">{liveMetrics ? fmtEur(liveMetrics.avgRevenuePerClient) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">LTV:CAC Ratio</span>
              <span className={`font-medium ${liveMetrics && liveMetrics.cac > 0 ? 'text-success' : ''}`}>
                {liveMetrics && liveMetrics.cac > 0
                  ? `${(liveMetrics.avgRevenuePerClient / liveMetrics.cac).toFixed(1)}:1`
                  : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gross Margin</span>
              <span className="font-medium">{liveMetrics ? `${liveMetrics.grossMargin.toFixed(1)}%` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Net Revenue (YTD)</span>
              <span className="font-medium">{liveMetrics ? fmtEur(liveMetrics.netRevenue) : '—'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Growth Indicators</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Revenue Growth (YoY)</span>
              <span className={`font-medium ${(liveMetrics?.growthRate ?? 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                {liveMetrics ? `${liveMetrics.growthRate >= 0 ? '+' : ''}${liveMetrics.growthRate.toFixed(1)}%` : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Client Growth (YoY)</span>
              <span className="font-medium">
                {liveMetrics && liveMetrics.prevClients > 0
                  ? `${liveMetrics.totalClients > liveMetrics.prevClients ? '+' : ''}${((liveMetrics.totalClients / liveMetrics.prevClients - 1) * 100).toFixed(0)}%`
                  : liveMetrics?.totalClients ? `${liveMetrics.totalClients} new` : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg Deal Size</span>
              <span className="font-medium">
                {liveMetrics && liveMetrics.totalPlacements > 0
                  ? fmtEur(liveMetrics.netRevenue / liveMetrics.totalPlacements)
                  : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Verified Users</span>
              <span className="font-medium">{metrics?.verified_users || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Previous Year Revenue</span>
              <span className="font-medium">{liveMetrics ? fmtEur(liveMetrics.prevNetRevenue) : '—'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
