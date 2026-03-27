import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DynamicChart } from '@/components/charts/DynamicChart';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { grossToNet } from '@/lib/vatRates';
import { formatCurrency } from '@/lib/currency';
import { TrendingUp, Target } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface PredictiveRevenueModelProps {
  legalEntity?: string;
}

export function PredictiveRevenueModel({ legalEntity }: PredictiveRevenueModelProps) {
  const { t } = useTranslation('common');
  const { data, isLoading } = useQuery({
    queryKey: ['predictive-revenue-model', legalEntity],
    queryFn: async () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentQ = Math.ceil((now.getMonth() + 1) / 3);

      // Get historical quarterly revenue (last 8 quarters)
      const quarters: { label: string; revenue: number; type: 'actual' | 'projected' }[] = [];

      for (let i = 7; i >= 0; i--) {
        let qYear = currentYear;
        let q = currentQ - i;
        while (q <= 0) { q += 4; qYear--; }
        while (q > 4) { q -= 4; qYear++; }

        const qStart = `${qYear}-${String((q - 1) * 3 + 1).padStart(2, '0')}-01`;
        const qEndMonth = q * 3;
        const qEnd = `${qYear}-${String(qEndMonth).padStart(2, '0')}-${qEndMonth === 2 ? 28 : [4,6,9,11].includes(qEndMonth) ? 30 : 31}`;

        let query = supabase
          .from('moneybird_sales_invoices')
          .select('total_amount, net_amount')
          .gte('invoice_date', qStart)
          .lte('invoice_date', qEnd);
        if (legalEntity && legalEntity !== 'all') query = query.eq('legal_entity', legalEntity);
        const { data: invs } = await query;

        const rev = (invs || []).reduce((s, inv) =>
          s + (Number(inv.net_amount) || grossToNet(Number(inv.total_amount) || 0)), 0);

        const isPast = qYear < currentYear || (qYear === currentYear && q <= currentQ);
        quarters.push({
          label: `Q${q} ${qYear}`,
          revenue: Math.round(rev),
          type: isPast ? 'actual' : 'projected',
        });
      }

      // Get pipeline for projections
      const { data: pipeline } = await supabase
        .from('placement_fees')
        .select('fee_amount_eur, status')
        .in('status', ['pending', 'approved']);

      const pipelineValue = (pipeline || []).reduce((s, f) => {
        const prob = f.status === 'approved' ? 0.8 : 0.5;
        return s + (f.fee_amount_eur || 0) * prob;
      }, 0);

      // Simple linear regression on actual quarters for trend
      const actuals = quarters.filter((q) => q.type === 'actual' && q.revenue > 0);
      let slope = 0;
      let lastActualRev = 0;
      if (actuals.length >= 2) {
        const n = actuals.length;
        const sumX = (n * (n - 1)) / 2;
        const sumY = actuals.reduce((s, q) => s + q.revenue, 0);
        const sumXY = actuals.reduce((s, q, i) => s + i * q.revenue, 0);
        const sumX2 = actuals.reduce((s, _, i) => s + i * i, 0);
        slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        lastActualRev = actuals[actuals.length - 1].revenue;
      }

      // Project next 4 quarters
      const projectedQuarters: { label: string; p10: number; p50: number; p90: number }[] = [];
      for (let i = 1; i <= 4; i++) {
        let pQ = currentQ + i;
        let pY = currentYear;
        while (pQ > 4) { pQ -= 4; pY++; }

        const baseProjection = Math.max(0, lastActualRev + slope * i);
        const pipelineContrib = pipelineValue / 4; // Spread pipeline across 4 quarters

        const p50 = baseProjection + pipelineContrib;
        const p10 = p50 * 0.6; // Bear case
        const p90 = p50 * 1.5; // Bull case

        projectedQuarters.push({
          label: `Q${pQ} ${pY}`,
          p10: Math.round(p10),
          p50: Math.round(p50),
          p90: Math.round(p90),
        });
      }

      // Build chart data
      const chartData = [
        ...quarters.filter((q) => q.type === 'actual').map((q) => ({
          quarter: q.label,
          actual: q.revenue,
          p10: null as number | null,
          p50: null as number | null,
          p90: null as number | null,
        })),
        ...projectedQuarters.map((q) => ({
          quarter: q.label,
          actual: null as number | null,
          p10: q.p10,
          p50: q.p50,
          p90: q.p90,
        })),
      ];

      return {
        chartData,
        projectedQuarters,
        pipelineValue: Math.round(pipelineValue),
        totalPipelineDeals: pipeline?.length || 0,
        quarterlyGrowthRate: slope > 0 && lastActualRev > 0 ? (slope / lastActualRev) * 100 : 0,
        nextQuarterP50: projectedQuarters[0]?.p50 || 0,
      };
    },
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return <Card><CardContent className="pt-6"><Skeleton className="h-[400px]" /></CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Predictive Revenue Model
        </CardTitle>
        <CardDescription>
          Pipeline-based forward projections with confidence intervals (P10/P50/P90)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-3 md:grid-cols-3">
          <div className="p-3 rounded-lg border">
            <p className="text-sm text-muted-foreground">{t("next_quarter_p50", "Next Quarter (P50)")}</p>
            <p className="text-lg font-bold">{formatCurrency(data?.nextQuarterP50 || 0)}</p>
          </div>
          <div className="p-3 rounded-lg border">
            <p className="text-sm text-muted-foreground">{t("pipeline_value_weighted", "Pipeline Value (Weighted)")}</p>
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold">{formatCurrency(data?.pipelineValue || 0)}</p>
              <Badge variant="outline">{data?.totalPipelineDeals || 0} deals</Badge>
            </div>
          </div>
          <div className="p-3 rounded-lg border">
            <p className="text-sm text-muted-foreground">{t("qoq_growth_trend", "QoQ Growth Trend")}</p>
            <p className={`text-lg font-bold ${(data?.quarterlyGrowthRate || 0) >= 0 ? 'text-green-500' : 'text-destructive'}`}>
              {(data?.quarterlyGrowthRate || 0) >= 0 ? '+' : ''}{(data?.quarterlyGrowthRate || 0).toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Chart */}
        {data?.chartData && data.chartData.length > 0 && (
          <DynamicChart
            type="composed"
            data={data.chartData}
            height={300}
            config={{
              xAxisKey: 'quarter',
              areas: [
                {
                  dataKey: 'p90',
                  stroke: 'hsl(var(--chart-2))',
                  fill: 'hsl(var(--chart-2))',
                  fillOpacity: 0.08,
                  name: 'P90 (Bull)',
                  type: 'monotone',
                },
                {
                  dataKey: 'p10',
                  stroke: 'hsl(var(--chart-4))',
                  fill: 'hsl(var(--chart-4))',
                  fillOpacity: 0.08,
                  name: 'P10 (Bear)',
                  type: 'monotone',
                },
              ],
              lines: [
                {
                  dataKey: 'actual',
                  stroke: 'hsl(var(--chart-1))',
                  strokeWidth: 2,
                  name: 'Actual',
                  dot: { r: 4 },
                },
                {
                  dataKey: 'p50',
                  stroke: 'hsl(var(--primary))',
                  strokeWidth: 2,
                  name: 'P50 (Base)',
                  type: 'monotone',
                },
              ],
              legend: true,
              yAxisFormatter: (v: number) => `€${(v / 1000).toFixed(0)}k`,
            }}
          />
        )}

        {/* Quarterly Projections Table */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Quarterly Projections
          </h4>
          <div className="grid gap-2 md:grid-cols-4">
            {(data?.projectedQuarters || []).map((q) => (
              <div key={q.label} className="p-3 rounded-lg border text-center">
                <p className="text-sm font-medium">{q.label}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(q.p10)} – {formatCurrency(q.p90)}
                </p>
                <p className="text-lg font-bold text-primary">{formatCurrency(q.p50)}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
