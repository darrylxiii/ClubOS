import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DynamicChart } from '@/components/charts/DynamicChart';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/revenueCalculations';

interface CohortRow {
  cohort: string;
  clients: number;
  revenue: number;
  avgDealSize: number;
  placements: number;
}

function useRevenueCohorts() {
  return useQuery({
    queryKey: ['revenue-cohorts'],
    queryFn: async () => {
      // Get placement fees with company info for cohort grouping
      const { data: fees, error } = await supabase
        .from('placement_fees')
        .select('fee_amount, created_at, partner_company_id')
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!fees || fees.length === 0) return [];

      // Group by quarter-year cohort based on first placement per company
      const companyFirstPlacement: Record<string, string> = {};
      const companyRevenue: Record<string, { revenue: number; placements: number }> = {};

      fees.forEach((fee) => {
        const cid = fee.partner_company_id || 'unknown';
        const date = new Date(fee.created_at);
        const q = `Q${Math.ceil((date.getMonth() + 1) / 3)} ${date.getFullYear()}`;

        if (!companyFirstPlacement[cid] || fee.created_at < companyFirstPlacement[cid]) {
          companyFirstPlacement[cid] = q;
        }
        if (!companyRevenue[cid]) companyRevenue[cid] = { revenue: 0, placements: 0 };
        companyRevenue[cid].revenue += fee.fee_amount || 0;
        companyRevenue[cid].placements += 1;
      });

      // Aggregate by cohort
      const cohortMap: Record<string, CohortRow> = {};
      Object.entries(companyFirstPlacement).forEach(([cid, cohort]) => {
        if (!cohortMap[cohort]) {
          cohortMap[cohort] = { cohort, clients: 0, revenue: 0, avgDealSize: 0, placements: 0 };
        }
        cohortMap[cohort].clients += 1;
        cohortMap[cohort].revenue += companyRevenue[cid]?.revenue || 0;
        cohortMap[cohort].placements += companyRevenue[cid]?.placements || 0;
      });

      // Calculate avg deal size
      const cohorts = Object.values(cohortMap)
        .map((c) => ({
          ...c,
          avgDealSize: c.placements > 0 ? Math.round(c.revenue / c.placements) : 0,
        }))
        .sort((a, b) => a.cohort.localeCompare(b.cohort));

      return cohorts;
    },
  });
}

export function RevenueCohortAnalysis() {
  const { data: cohorts, isLoading } = useRevenueCohorts();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px]" />
        </CardContent>
      </Card>
    );
  }

  if (!cohorts || cohorts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue Cohorts</CardTitle>
          <CardDescription>Customer cohort analysis by first placement quarter</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No placement data yet. Cohort analysis will appear after the first recorded placement fee.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalRevenue = cohorts.reduce((s, c) => s + c.revenue, 0);
  const totalClients = cohorts.reduce((s, c) => s + c.clients, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Revenue Cohorts</CardTitle>
            <CardDescription>Customer cohort analysis by first placement quarter</CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline">{totalClients} clients</Badge>
            <Badge variant="outline">{formatCurrency(totalRevenue)} total</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <DynamicChart
          type="bar"
          data={cohorts}
          height={280}
          config={{
            xAxisKey: 'cohort',
            bars: [
              {
                dataKey: 'revenue',
                fill: 'hsl(var(--chart-1))',
                name: 'Total Revenue',
                radius: [4, 4, 0, 0],
              },
            ],
            legend: true,
            yAxisFormatter: (v: number) => `€${(v / 1000).toFixed(0)}k`,
          }}
        />

        {/* Cohort table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2 font-medium">Cohort</th>
                <th className="text-right py-2 font-medium">Clients</th>
                <th className="text-right py-2 font-medium">Placements</th>
                <th className="text-right py-2 font-medium">Revenue</th>
                <th className="text-right py-2 font-medium">Avg Deal</th>
              </tr>
            </thead>
            <tbody>
              {cohorts.map((c) => (
                <tr key={c.cohort} className="border-b border-border/50">
                  <td className="py-2 font-medium">{c.cohort}</td>
                  <td className="py-2 text-right">{c.clients}</td>
                  <td className="py-2 text-right">{c.placements}</td>
                  <td className="py-2 text-right">{formatCurrency(c.revenue)}</td>
                  <td className="py-2 text-right">{formatCurrency(c.avgDealSize)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default RevenueCohortAnalysis;
