import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Calendar, Target, ArrowUpRight } from "lucide-react";
import { formatCurrency } from "@/lib/revenueCalculations";

interface ARRMetrics {
  currentARR: number;
  currentMRR: number;
  previousARR: number;
  arrGrowth: number;
  contractValue: number;
  avgContractLength: number;
  customerCount: number;
  avgRevenuePerCustomer: number;
  netRevenueRetention: number;
  monthlyTrend: { month: string; arr: number }[];
}

export function ARRTracker() {
  const { data, isLoading } = useQuery({
    queryKey: ['arr-metrics'],
    queryFn: async (): Promise<ARRMetrics> => {
      const currentYear = new Date().getFullYear();
      const lastYear = currentYear - 1;

      // Fetch enterprise contracts for ARR calculation
      const { data: contracts } = await supabase
        .from('enterprise_contracts')
        .select('*')
        .in('status', ['active', 'renewed']);

      // Calculate ARR from contracts
      const currentARR = contracts?.reduce((sum, c) => {
        const annualValue = (c.annual_value || 0) * (12 / (c.term_months || 12));
        return sum + annualValue;
      }, 0) || 0;

      // Fetch Moneybird invoices for revenue tracking
      const { data: currentInvoices } = await supabase
        .from('moneybird_sales_invoices')
        .select('total_amount, invoice_date, company_id')
        .gte('invoice_date', `${currentYear}-01-01`);

      const { data: previousInvoices } = await supabase
        .from('moneybird_sales_invoices')
        .select('total_amount')
        .gte('invoice_date', `${lastYear}-01-01`)
        .lt('invoice_date', `${currentYear}-01-01`);

      const currentRevenue = currentInvoices?.reduce((sum, inv) => 
        sum + (Number(inv.total_amount) || 0), 0) || 0;
      const previousRevenue = previousInvoices?.reduce((sum, inv) => 
        sum + (Number(inv.total_amount) || 0), 0) || 0;

      // Annualize current revenue (project full year from YTD)
      const monthsElapsed = new Date().getMonth() + 1;
      const projectedARR = (currentRevenue / monthsElapsed) * 12;

      // Use max of contract ARR and projected invoice ARR
      const effectiveARR = Math.max(currentARR, projectedARR);
      const effectiveMRR = effectiveARR / 12;

      // Unique customers
      const uniqueCompanies = new Set(currentInvoices?.map(i => i.company_id).filter(Boolean));
      const customerCount = uniqueCompanies.size || contracts?.length || 0;

      // Average contract length
      const avgContractLength = contracts?.length 
        ? contracts.reduce((sum, c) => sum + (c.term_months || 12), 0) / contracts.length
        : 12;

      // Calculate monthly trend
      const monthlyTrend: { month: string; arr: number }[] = [];
      for (let i = 0; i < 12; i++) {
        const month = new Date(currentYear, i, 1);
        const monthName = month.toLocaleString('default', { month: 'short' });
        const monthInvoices = currentInvoices?.filter(inv => {
          const invDate = new Date(inv.invoice_date);
          return invDate.getMonth() === i;
        }) || [];
        const monthRevenue = monthInvoices.reduce((sum, inv) => 
          sum + (Number(inv.total_amount) || 0), 0);
        monthlyTrend.push({ month: monthName, arr: monthRevenue * 12 });
      }

      // Growth calculation
      const arrGrowth = previousRevenue > 0 
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
        : 0;

      // Net Revenue Retention (simplified - using current vs previous)
      const nrr = previousRevenue > 0 ? (currentRevenue / previousRevenue) * 100 : 100;

      return {
        currentARR: effectiveARR,
        currentMRR: effectiveMRR,
        previousARR: previousRevenue,
        arrGrowth,
        contractValue: contracts?.reduce((sum, c) => sum + (c.total_contract_value || 0), 0) || 0,
        avgContractLength,
        customerCount,
        avgRevenuePerCustomer: customerCount > 0 ? effectiveARR / customerCount : 0,
        netRevenueRetention: nrr,
        monthlyTrend,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="glass-card">
            <CardContent className="pt-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metrics = [
    {
      title: 'Annual Recurring Revenue',
      value: formatCurrency(data?.currentARR || 0),
      icon: DollarSign,
      subtitle: `MRR: ${formatCurrency(data?.currentMRR || 0)}`,
      badge: data?.arrGrowth ? (
        <Badge variant={data.arrGrowth >= 0 ? "default" : "destructive"} className="ml-2">
          {data.arrGrowth >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
          {Math.abs(data.arrGrowth).toFixed(1)}%
        </Badge>
      ) : null,
    },
    {
      title: 'Active Customers',
      value: data?.customerCount || 0,
      icon: Target,
      subtitle: `ARPC: ${formatCurrency(data?.avgRevenuePerCustomer || 0)}`,
    },
    {
      title: 'Net Revenue Retention',
      value: `${(data?.netRevenueRetention || 100).toFixed(0)}%`,
      icon: ArrowUpRight,
      subtitle: data?.netRevenueRetention && data.netRevenueRetention >= 100 
        ? 'Healthy expansion' 
        : 'Focus on retention',
      badge: data?.netRevenueRetention && data.netRevenueRetention >= 100 ? (
        <Badge variant="default" className="ml-2 bg-success">Good</Badge>
      ) : (
        <Badge variant="destructive" className="ml-2">Below 100%</Badge>
      ),
    },
    {
      title: 'Avg Contract Length',
      value: `${(data?.avgContractLength || 12).toFixed(0)} mo`,
      icon: Calendar,
      subtitle: `Total TCV: ${formatCurrency(data?.contractValue || 0)}`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, idx) => (
          <Card key={idx} className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <metric.icon className="h-4 w-4 mr-2" />
                {metric.title}
                {metric.badge}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{metric.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{metric.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly ARR Trend */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Monthly ARR Trend
          </CardTitle>
          <CardDescription>Annualized revenue by month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-40">
            {data?.monthlyTrend.map((month, idx) => {
              const maxValue = Math.max(...(data.monthlyTrend.map(m => m.arr) || [1]));
              const height = maxValue > 0 ? (month.arr / maxValue) * 100 : 0;
              return (
                <div key={month.month} className="flex-1 flex flex-col items-center gap-1">
                  <div 
                    className="w-full bg-primary/20 hover:bg-primary/30 transition-colors rounded-t"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                  <span className="text-xs text-muted-foreground">{month.month}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
