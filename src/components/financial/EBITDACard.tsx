import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { grossToNet } from '@/lib/vatRates';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface EBITDACardProps {
  year: number;
  legalEntity?: string;
}

export function EBITDACard({ year, legalEntity }: EBITDACardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['ebitda-card', year, legalEntity],
    queryFn: async () => {
      const startOfYear = `${year}-01-01`;
      const prevStart = `${year - 1}-01-01`;

      const fetchYearData = async (ys: string, ye: string) => {
        let invQ = supabase.from('moneybird_sales_invoices').select('total_amount, net_amount').gte('invoice_date', ys).lt('invoice_date', ye);
        if (legalEntity && legalEntity !== 'all') invQ = invQ.eq('legal_entity', legalEntity);
        const { data: inv } = await invQ;
        const netRevenue = (inv || []).reduce((s, i) => s + (Number((i as any).net_amount) || grossToNet(Number(i.total_amount) || 0, legalEntity)), 0);

        let comQ = supabase.from('employee_commissions').select('gross_amount').gte('created_at', ys).lt('created_at', ye);
        if (legalEntity && legalEntity !== 'all') comQ = comQ.eq('legal_entity', legalEntity);
        const { data: comms } = await comQ;
        const commissions = (comms || []).reduce((s, c) => s + (c.gross_amount || 0), 0);

        let payQ = supabase.from('referral_payouts').select('payout_amount').gte('created_at', ys).lt('created_at', ye);
        if (legalEntity && legalEntity !== 'all') payQ = payQ.eq('legal_entity', legalEntity);
        const { data: pays } = await payQ;
        const payouts = (pays || []).reduce((s, p) => s + (p.payout_amount || 0), 0);

        let expQ = supabase.from('operating_expenses').select('amount_eur, amount').gte('expense_date', ys).lt('expense_date', ye);
        if (legalEntity && legalEntity !== 'all') expQ = expQ.eq('legal_entity', legalEntity);
        const { data: exps } = await expQ;
        const opex = (exps || []).reduce((s, e) => s + (Number((e as any).amount_eur ?? e.amount) || 0), 0);

        let subQ = supabase.from('vendor_subscriptions').select('monthly_cost, monthly_cost_eur, contract_start_date, status').eq('status', 'active');
        if (legalEntity && legalEntity !== 'all') subQ = subQ.eq('legal_entity', legalEntity);
        const { data: subs } = await subQ;
        const yearStart = new Date(parseInt(ys), 0, 1);
        const yearEnd = new Date(parseInt(ys) + 1, 0, 1);
        const now = new Date();
        const effectiveEnd = now < yearEnd ? now : yearEnd;
        const subsCost = (subs || []).reduce((sum, sub) => {
          const start = new Date(sub.contract_start_date);
          const effective = start > yearStart ? start : yearStart;
          const months = Math.max(0, (effectiveEnd.getFullYear() - effective.getFullYear()) * 12 + (effectiveEnd.getMonth() - effective.getMonth()) + 1);
          const cost = (sub as any).monthly_cost_eur ?? sub.monthly_cost;
          return sum + (cost * months);
        }, 0);

        const cogs = commissions + payouts;
        const grossProfit = netRevenue - cogs;
        const totalOpex = opex + subsCost;
        const ebitda = grossProfit - totalOpex;

        return { netRevenue, cogs, grossProfit, totalOpex, ebitda };
      };

      const current = await fetchYearData(startOfYear, `${year + 1}-01-01`);
      const previous = await fetchYearData(prevStart, startOfYear);

      return { current, previous };
    },
    staleTime: 5 * 60 * 1000,
  });

  const fmtEur = (v: number) => {
    if (Math.abs(v) >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000) return `€${(v / 1_000).toFixed(1)}K`;
    return `€${v.toFixed(0)}`;
  };

  const cur = data?.current;
  const prev = data?.previous;
  const ebitdaMargin = cur && cur.netRevenue > 0 ? (cur.ebitda / cur.netRevenue) * 100 : 0;
  const prevEbitdaMargin = prev && prev.netRevenue > 0 ? (prev.ebitda / prev.netRevenue) * 100 : 0;
  const grossMargin = cur && cur.netRevenue > 0 ? (cur.grossProfit / cur.netRevenue) * 100 : 0;

  // Rule of 40
  const revenueGrowth = prev && prev.netRevenue > 0 ? ((cur?.netRevenue || 0) / prev.netRevenue - 1) * 100 : 0;
  const ruleOf40 = revenueGrowth + ebitdaMargin;

  // Valuation multiples
  const annualizedEbitda = cur ? (cur.ebitda / Math.max(new Date().getMonth() + 1, 1)) * 12 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          EBITDA Analysis
          {cur && (
            <Badge variant={cur.ebitda >= 0 ? 'default' : 'destructive'} className="text-sm">
              {cur.ebitda >= 0 ? 'Profitable' : 'Loss'}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Earnings before interest, taxes, depreciation &amp; amortization — {year}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
          </div>
        ) : (
          <div className="space-y-4">
            {/* EBITDA Bridge */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Net Revenue</span>
                <span className="font-medium">{fmtEur(cur?.netRevenue || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">− COGS (Commissions + Payouts)</span>
                <span className="font-medium text-destructive">−{fmtEur(cur?.cogs || 0)}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-1">
                <span className="font-medium">Gross Profit</span>
                <span className="font-medium">{fmtEur(cur?.grossProfit || 0)} ({grossMargin.toFixed(1)}%)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">− OpEx (Expenses + Subscriptions)</span>
                <span className="font-medium text-destructive">−{fmtEur(cur?.totalOpex || 0)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-primary/30 pt-1">
                <span className="font-bold">EBITDA</span>
                <span className={`font-bold ${(cur?.ebitda || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {fmtEur(cur?.ebitda || 0)}
                </span>
              </div>
            </div>

            {/* Key ratios */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">EBITDA Margin</p>
                <p className="text-lg font-bold">{ebitdaMargin.toFixed(1)}%</p>
                {prev && prev.netRevenue > 0 && (
                  <div className="flex items-center gap-1 text-xs">
                    {ebitdaMargin > prevEbitdaMargin ? (
                      <TrendingUp className="h-3 w-3 text-success" />
                    ) : ebitdaMargin < prevEbitdaMargin ? (
                      <TrendingDown className="h-3 w-3 text-destructive" />
                    ) : (
                      <Minus className="h-3 w-3" />
                    )}
                    <span className="text-muted-foreground">vs {prevEbitdaMargin.toFixed(1)}% ({year - 1})</span>
                  </div>
                )}
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Rule of 40</p>
                <p className={`text-lg font-bold ${ruleOf40 >= 40 ? 'text-success' : ruleOf40 >= 20 ? 'text-warning' : 'text-destructive'}`}>
                  {ruleOf40.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Growth {revenueGrowth.toFixed(0)}% + Margin {ebitdaMargin.toFixed(0)}%
                </p>
              </div>
            </div>

            {/* Valuation multiples */}
            {annualizedEbitda > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-2">Implied Valuation (EBITDA multiples)</p>
                <div className="grid grid-cols-3 gap-2">
                  {[10, 15, 20].map((m) => (
                    <div key={m} className="text-center p-2 rounded bg-muted/30">
                      <p className="text-xs text-muted-foreground">{m}x</p>
                      <p className="font-bold text-sm">{fmtEur(annualizedEbitda * m)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
