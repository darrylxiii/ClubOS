import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { grossToNet } from '@/lib/vatRates';
import { formatCurrency } from '@/lib/currency';
import useRecharts from '@/hooks/useRecharts';

export function RevenueWaterfallChart({ legalEntity }: { legalEntity?: string }) {
  const { t } = useTranslation('common');
  const { recharts, isLoading: chartsLoading } = useRecharts();
  const currentYear = new Date().getFullYear();

  const { data, isLoading } = useQuery({
    queryKey: ['revenue-waterfall', currentYear, legalEntity],
    queryFn: async () => {
      // Get invoices by quarter for current and previous year
      const quarters: { label: string; start: string; end: string }[] = [];
      for (let yr = currentYear - 1; yr <= currentYear; yr++) {
        for (let q = 0; q < 4; q++) {
          const m1 = q * 3 + 1;
          quarters.push({
            label: `Q${q + 1} ${yr}`,
            start: `${yr}-${String(m1).padStart(2, '0')}-01`,
            end: q < 3 ? `${yr}-${String(m1 + 3).padStart(2, '0')}-01` : `${yr + 1}-01-01`,
          });
        }
      }

      const results: { quarter: string; revenue: number; clients: Set<string> }[] = [];

      for (const q of quarters) {
        let query = supabase
          .from('moneybird_sales_invoices')
          .select('total_amount, net_amount, contact_id')
          .gte('invoice_date', q.start)
          .lt('invoice_date', q.end);

        if (legalEntity && legalEntity !== 'all') query = query.eq('legal_entity', legalEntity);
        const { data: invs } = await query;

        const revenue = (invs || []).reduce(
          (s, i) => s + (Number(i.net_amount) || grossToNet(Number(i.total_amount) || 0, legalEntity)),
          0,
        );
        const clients = new Set((invs || []).map((i) => i.contact_id).filter(Boolean));
        results.push({ quarter: q.label, revenue, clients });
      }

      // Build waterfall data
      const waterfallData = results.map((cur, i) => {
        if (i === 0) {
          return { quarter: cur.quarter, revenue: cur.revenue, newClients: 0, expansion: 0, contraction: 0, churned: 0 };
        }

        const prev = results[i - 1];
        const prevClients = prev.clients;
        const curClients = cur.clients;

        // Rough waterfall decomposition
        const newClientSet = new Set([...curClients].filter((c) => !prevClients.has(c)));
        const churnedSet = new Set([...prevClients].filter((c) => !curClients.has(c)));
        const retainedRevenue = cur.revenue - (cur.revenue * (newClientSet.size / Math.max(curClients.size, 1)));
        const expansion = Math.max(0, retainedRevenue - prev.revenue + (prev.revenue * (churnedSet.size / Math.max(prevClients.size, 1))));
        const contraction = Math.max(0, -Math.min(0, retainedRevenue - prev.revenue));

        return {
          quarter: cur.quarter,
          revenue: cur.revenue,
          newClients: cur.revenue * (newClientSet.size / Math.max(curClients.size, 1)),
          expansion,
          contraction: -contraction,
          churned: -(prev.revenue * (churnedSet.size / Math.max(prevClients.size, 1))),
        };
      });

      return waterfallData.slice(-6); // last 6 quarters
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || chartsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("revenue_waterfall", "Revenue Waterfall")}</CardTitle>
        </CardHeader>
        <CardContent><Skeleton className="h-64 w-full" /></CardContent>
      </Card>
    );
  }

  if (!data || !recharts) {
    return (
      <Card>
        <CardHeader><CardTitle>{t("revenue_waterfall", "Revenue Waterfall")}</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">{t("no_data_available", "No data available")}</p></CardContent>
      </Card>
    );
  }

  const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = recharts;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("revenue_waterfall", "Revenue Waterfall")}</CardTitle>
        <CardDescription>{t("quarterly_arr_movement_new", "Quarterly ARR movement — new clients, expansion, contraction, and churn")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} stackOffset="sign">
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="quarter" tick={{ fontSize: 11 }} />
              <YAxis
                tickFormatter={(v: number) => `€${(v / 1000).toFixed(0)}K`}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                formatter={(v: number, name: string) => [formatCurrency(Math.abs(v), 'EUR'), name]}
              />
              <Legend />
              <Bar dataKey="newClients" name="New Clients" stackId="a" fill="hsl(var(--primary))" />
              <Bar dataKey="expansion" name="Expansion" stackId="a" fill="hsl(142, 71%, 45%)" />
              <Bar dataKey="contraction" name="Contraction" stackId="a" fill="hsl(38, 92%, 50%)" />
              <Bar dataKey="churned" name="Churned" stackId="a" fill="hsl(0, 84%, 60%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          {data.length > 0 && (() => {
            const latest = data[data.length - 1];
            return (
              <>
                <div className="text-center p-2 rounded bg-primary/10">
                  <p className="text-xs text-muted-foreground">{t("net_revenue", "Net Revenue")}</p>
                  <p className="font-bold text-sm">{formatCurrency(latest.revenue, 'EUR')}</p>
                </div>
                <div className="text-center p-2 rounded bg-success/10">
                  <p className="text-xs text-muted-foreground">{t("new_clients", "New Clients")}</p>
                  <p className="font-bold text-sm text-success">{formatCurrency(latest.newClients, 'EUR')}</p>
                </div>
                <div className="text-center p-2 rounded bg-warning/10">
                  <p className="text-xs text-muted-foreground">{t("contraction", "Contraction")}</p>
                  <p className="font-bold text-sm text-warning">{formatCurrency(Math.abs(latest.contraction), 'EUR')}</p>
                </div>
                <div className="text-center p-2 rounded bg-destructive/10">
                  <p className="text-xs text-muted-foreground">{t("churned", "Churned")}</p>
                  <p className="font-bold text-sm text-destructive">{formatCurrency(Math.abs(latest.churned), 'EUR')}</p>
                </div>
              </>
            );
          })()}
        </div>
      </CardContent>
    </Card>
  );
}
