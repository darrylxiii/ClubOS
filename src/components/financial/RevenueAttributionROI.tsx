import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useVendorSubscriptions } from '@/hooks/useVendorSubscriptions';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/currency';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * For subscriptions with revenue_attribution set,
 * compares annual subscription cost against attributed revenue
 * to calculate real ROI.
 */
export function RevenueAttributionROI() {
  const { data: subscriptions, isLoading: subsLoading } = useVendorSubscriptions('active');

  // Get total net revenue for the year
  const currentYear = new Date().getFullYear();
  const { data: totalRevenue, isLoading: revLoading } = useQuery({
    queryKey: ['total-net-revenue', currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('moneybird_sales_invoices')
        .select('net_amount, total_amount')
        .gte('invoice_date', `${currentYear}-01-01`);
      if (error) throw error;
      return (data || []).reduce(
        (sum, inv) => sum + (Number(inv.net_amount) || Number(inv.total_amount) / 1.21 || 0),
        0
      );
    },
    staleTime: 120_000,
  });

  const isLoading = subsLoading || revLoading;

  // Filter only subscriptions with revenue_attribution metadata
  const attributedSubs = (subscriptions || []).filter(
    (sub) => (sub as any).revenue_attribution || sub.business_criticality === 'critical'
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-[200px]" />
        </CardContent>
      </Card>
    );
  }

  if (attributedSubs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue Attribution ROI</CardTitle>
          <CardDescription>
            Set revenue attribution on subscriptions to track their ROI against your revenue.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const netRevenue = totalRevenue || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Subscription ROI Analysis</CardTitle>
        <CardDescription>
          Cost justification for critical and revenue-attributed tools
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tool</TableHead>
              <TableHead>Criticality</TableHead>
              <TableHead className="text-right">Annual Cost</TableHead>
              <TableHead className="text-right">% of Revenue</TableHead>
              <TableHead>ROI Signal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attributedSubs.map((sub) => {
              const annualCost = sub.annual_cost || sub.monthly_cost * 12;
              const revenuePercent = netRevenue > 0 ? (annualCost / netRevenue) * 100 : 0;

              // Simple ROI signal: <1% of revenue = excellent, <3% = good, >5% = review
              const signal =
                revenuePercent < 1
                  ? 'excellent'
                  : revenuePercent < 3
                  ? 'good'
                  : revenuePercent < 5
                  ? 'fair'
                  : 'review';

              const SignalIcon =
                signal === 'excellent' || signal === 'good'
                  ? TrendingUp
                  : signal === 'fair'
                  ? Minus
                  : TrendingDown;

              return (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">{sub.vendor_name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        sub.business_criticality === 'critical'
                          ? 'destructive'
                          : sub.business_criticality === 'high'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {sub.business_criticality}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(annualCost)}</TableCell>
                  <TableCell className="text-right">{revenuePercent.toFixed(2)}%</TableCell>
                  <TableCell>
                    <span
                      className={`flex items-center gap-1 text-xs font-medium ${
                        signal === 'excellent' || signal === 'good'
                          ? 'text-success'
                          : signal === 'fair'
                          ? 'text-warning'
                          : 'text-destructive'
                      }`}
                    >
                      <SignalIcon className="h-3 w-3" />
                      {signal.charAt(0).toUpperCase() + signal.slice(1)}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default RevenueAttributionROI;
