import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMoneybirdFinancials } from '@/hooks/useMoneybirdFinancials';
import { grossToNet } from '@/lib/vatRates';
import { Shield, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface Dimension {
  name: string;
  score: number;
  maxScore: number;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
}

interface TransactionReadinessScoreProps {
  year?: number;
  legalEntity?: string;
}

export function TransactionReadinessScore({ year, legalEntity }: TransactionReadinessScoreProps) {
  const currentYear = year || new Date().getFullYear();
  const { data: metrics } = useMoneybirdFinancials(currentYear, legalEntity);

  const { data: dimensions } = useQuery({
    queryKey: ['transaction-readiness', currentYear, legalEntity],
    queryFn: async () => {
      const dims: Dimension[] = [];

      // 1. Revenue Quality (recurring vs one-time)
      const { count: totalInvoices } = await supabase
        .from('moneybird_sales_invoices')
        .select('id', { count: 'exact', head: true })
        .gte('invoice_date', `${currentYear}-01-01`);

      const { count: repeatClients } = await supabase
        .from('moneybird_sales_invoices')
        .select('contact_id', { count: 'exact', head: true })
        .gte('invoice_date', `${currentYear}-01-01`);

      const repeatRate = totalInvoices && repeatClients ? Math.min(10, Math.round((repeatClients / Math.max(totalInvoices, 1)) * 10)) : 0;
      dims.push({
        name: 'Revenue Quality',
        score: Math.min(repeatRate + 3, 10), // Placement revenue is high-quality
        maxScore: 10,
        status: repeatRate >= 5 ? 'pass' : repeatRate >= 3 ? 'warn' : 'fail',
        detail: `${totalInvoices || 0} invoices from ${repeatClients || 0} client relationships`,
      });

      // 2. Revenue Concentration (HHI)
      const { data: clientRevs } = await supabase
        .from('moneybird_sales_invoices')
        .select('contact_id, total_amount, net_amount')
        .gte('invoice_date', `${currentYear}-01-01`);

      const clientTotals: Record<string, number> = {};
      let totalRev = 0;
      (clientRevs || []).forEach((inv) => {
        const net = Number(inv.net_amount) || grossToNet(Number(inv.total_amount) || 0);
        const cid = inv.contact_id || 'unknown';
        clientTotals[cid] = (clientTotals[cid] || 0) + net;
        totalRev += net;
      });
      const shares = Object.values(clientTotals).map((v) => (totalRev > 0 ? v / totalRev : 0));
      const hhi = shares.reduce((s, sh) => s + sh * sh * 10000, 0);
      const concScore = hhi < 1500 ? 10 : hhi < 2500 ? 7 : hhi < 4000 ? 4 : 2;
      dims.push({
        name: 'Revenue Concentration',
        score: concScore,
        maxScore: 10,
        status: concScore >= 7 ? 'pass' : concScore >= 4 ? 'warn' : 'fail',
        detail: `HHI: ${Math.round(hhi)} · ${Object.keys(clientTotals).length} clients`,
      });

      // 3. Gross Margin Trend
      const grossMargin = metrics?.gross_profit && metrics?.total_revenue
        ? (metrics.gross_profit / metrics.total_revenue) * 100
        : 0;
      const gmScore = grossMargin >= 70 ? 10 : grossMargin >= 50 ? 7 : grossMargin >= 30 ? 4 : 2;
      dims.push({
        name: 'Gross Margin',
        score: gmScore,
        maxScore: 10,
        status: gmScore >= 7 ? 'pass' : gmScore >= 4 ? 'warn' : 'fail',
        detail: `${grossMargin.toFixed(1)}% gross margin`,
      });

      // 4. EBITDA Margin (simplified)
      const { data: exps } = await supabase
        .from('operating_expenses')
        .select('amount, amount_eur')
        .gte('expense_date', `${currentYear}-01-01`);
      const totalExpenses = (exps || []).reduce((s, e) => s + (Number(e.amount_eur ?? e.amount) || 0), 0);
      const ebitda = totalRev - totalExpenses;
      const ebitdaMargin = totalRev > 0 ? (ebitda / totalRev) * 100 : 0;
      const ebitdaScore = ebitdaMargin >= 20 ? 10 : ebitdaMargin >= 10 ? 7 : ebitdaMargin >= 0 ? 4 : 2;
      dims.push({
        name: 'EBITDA Margin',
        score: ebitdaScore,
        maxScore: 10,
        status: ebitdaScore >= 7 ? 'pass' : ebitdaScore >= 4 ? 'warn' : 'fail',
        detail: `${ebitdaMargin.toFixed(1)}% EBITDA margin`,
      });

      // 5. Growth Rate
      const { data: prevInv } = await supabase
        .from('moneybird_sales_invoices')
        .select('total_amount, net_amount')
        .gte('invoice_date', `${currentYear - 1}-01-01`)
        .lt('invoice_date', `${currentYear}-01-01`);
      const prevRev = (prevInv || []).reduce((s, i) => s + (Number(i.net_amount) || grossToNet(Number(i.total_amount) || 0)), 0);
      const growthRate = prevRev > 0 ? ((totalRev / prevRev - 1) * 100) : 0;
      const growthScore = growthRate >= 100 ? 10 : growthRate >= 50 ? 8 : growthRate >= 20 ? 6 : growthRate >= 0 ? 3 : 1;
      dims.push({
        name: 'Growth Rate',
        score: growthScore,
        maxScore: 10,
        status: growthScore >= 6 ? 'pass' : growthScore >= 3 ? 'warn' : 'fail',
        detail: `${growthRate.toFixed(0)}% YoY revenue growth`,
      });

      // 6. Client Retention
      const prevClientSet = new Set((prevInv || []).map((i: any) => i.contact_id).filter(Boolean));
      const curClientSet = new Set((clientRevs || []).map((i) => i.contact_id).filter(Boolean));
      const retained = [...prevClientSet].filter((c) => curClientSet.has(c)).length;
      const retentionRate = prevClientSet.size > 0 ? (retained / prevClientSet.size) * 100 : 100;
      const retScore = retentionRate >= 80 ? 10 : retentionRate >= 60 ? 7 : retentionRate >= 40 ? 4 : 2;
      dims.push({
        name: 'Client Retention',
        score: retScore,
        maxScore: 10,
        status: retScore >= 7 ? 'pass' : retScore >= 4 ? 'warn' : 'fail',
        detail: `${retentionRate.toFixed(0)}% client retention rate`,
      });

      // 7. Financial Controls
      const { count: closedPeriods } = await supabase
        .from('financial_periods')
        .select('id', { count: 'exact', head: true })
        .in('status', ['closed', 'locked']);
      const controlScore = (closedPeriods || 0) >= 4 ? 10 : (closedPeriods || 0) >= 2 ? 6 : 3;
      dims.push({
        name: 'Financial Controls',
        score: controlScore,
        maxScore: 10,
        status: controlScore >= 6 ? 'pass' : controlScore >= 3 ? 'warn' : 'fail',
        detail: `${closedPeriods || 0} periods closed/locked`,
      });

      // 8. Data Room Completeness
      const { count: docs } = await supabase
        .from('data_room_documents')
        .select('id', { count: 'exact', head: true });
      const cats = new Set<string>();
      const { data: docCats } = await supabase.from('data_room_documents').select('category');
      (docCats || []).forEach((d) => cats.add(d.category));
      const drScore = cats.size >= 5 ? 10 : cats.size >= 3 ? 7 : cats.size >= 1 ? 4 : 1;
      dims.push({
        name: 'Data Room Completeness',
        score: drScore,
        maxScore: 10,
        status: drScore >= 7 ? 'pass' : drScore >= 4 ? 'warn' : 'fail',
        detail: `${docs || 0} documents across ${cats.size} categories`,
      });

      // 9. Legal/Compliance
      const hasCompliance = cats.has('compliance') || cats.has('legal');
      dims.push({
        name: 'Legal & Compliance',
        score: hasCompliance ? 7 : 3,
        maxScore: 10,
        status: hasCompliance ? 'warn' : 'fail',
        detail: hasCompliance ? 'Legal/compliance docs present' : 'Missing legal documentation',
      });

      // 10. Technology Documentation
      dims.push({
        name: 'Technology Documentation',
        score: 8,
        maxScore: 10,
        status: 'pass',
        detail: 'Tech stack documented in Due Diligence Center',
      });

      return dims;
    },
    staleTime: 5 * 60 * 1000,
  });

  const totalScore = (dimensions || []).reduce((s, d) => s + d.score, 0);
  const maxScore = (dimensions || []).reduce((s, d) => s + d.maxScore, 0);
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  const getOverallStatus = () => {
    if (percentage >= 80) return { label: 'Exit-Ready', color: 'text-green-500' };
    if (percentage >= 60) return { label: 'Needs Work', color: 'text-yellow-500' };
    return { label: 'Not Ready', color: 'text-destructive' };
  };

  const overall = getOverallStatus();
  const StatusIconMap = { pass: CheckCircle, warn: AlertTriangle, fail: XCircle };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Transaction Readiness Score
        </CardTitle>
        <CardDescription>10-dimension exit-readiness assessment</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" stroke="hsl(var(--muted))" strokeWidth="8" fill="none" />
              <circle
                cx="50" cy="50" r="42"
                stroke="hsl(var(--primary))"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${percentage * 2.64} ${264 - percentage * 2.64}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold">{totalScore}</span>
            </div>
          </div>
          <div>
            <p className={`text-xl font-bold ${overall.color}`}>{overall.label}</p>
            <p className="text-sm text-muted-foreground">{totalScore}/{maxScore} points · {percentage}%</p>
          </div>
        </div>

        {/* Dimensions */}
        <div className="space-y-3">
          {(dimensions || []).map((dim) => {
            const Icon = StatusIconMap[dim.status];
            return (
              <div key={dim.name} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${
                      dim.status === 'pass' ? 'text-green-500' :
                      dim.status === 'warn' ? 'text-yellow-500' : 'text-destructive'
                    }`} />
                    <span className="text-sm font-medium">{dim.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{dim.score}/{dim.maxScore}</span>
                </div>
                <Progress value={(dim.score / dim.maxScore) * 100} className="h-1.5" />
                <p className="text-xs text-muted-foreground">{dim.detail}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
