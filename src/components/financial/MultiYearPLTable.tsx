import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { grossToNet } from '@/lib/vatRates';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface MultiYearPLTableProps {
  legalEntity?: string;
}

interface YearPL {
  netRevenue: number;
  cogs: number;
  grossProfit: number;
  grossMarginPct: number;
  opex: number;
  ebitda: number;
  ebitdaMarginPct: number;
  netProfit: number;
  netMarginPct: number;
}

export function MultiYearPLTable({ legalEntity }: MultiYearPLTableProps) {
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear];

  const { data, isLoading } = useQuery({
    queryKey: ['multi-year-pl', legalEntity],
    queryFn: async () => {
      const results: Record<number, YearPL> = {};

      for (const year of years) {
        const ys = `${year}-01-01`;
        const ye = `${year + 1}-01-01`;

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
        const opexDirect = (exps || []).reduce((s, e) => s + (Number((e as any).amount_eur ?? e.amount) || 0), 0);

        let subQ = supabase.from('vendor_subscriptions').select('monthly_cost, monthly_cost_eur, contract_start_date, status').eq('status', 'active');
        if (legalEntity && legalEntity !== 'all') subQ = subQ.eq('legal_entity', legalEntity);
        const { data: subs } = await subQ;
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year + 1, 0, 1);
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
        const totalOpex = opexDirect + subsCost;
        const ebitda = grossProfit - totalOpex;
        const netProfit = ebitda; // Simplified: no interest/tax/depreciation tracked

        results[year] = {
          netRevenue,
          cogs,
          grossProfit,
          grossMarginPct: netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0,
          opex: totalOpex,
          ebitda,
          ebitdaMarginPct: netRevenue > 0 ? (ebitda / netRevenue) * 100 : 0,
          netProfit,
          netMarginPct: netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0,
        };
      }

      return results;
    },
    staleTime: 5 * 60 * 1000,
  });

  const fmtEur = (v: number) => {
    if (Math.abs(v) >= 1_000_000) return `€${(v / 1_000_000).toFixed(2)}M`;
    if (Math.abs(v) >= 1_000) return `€${(v / 1_000).toFixed(1)}K`;
    return `€${v.toFixed(0)}`;
  };

  const growthPct = (cur: number, prev: number) => {
    if (prev === 0) return cur > 0 ? '∞' : '—';
    const pct = ((cur / prev) - 1) * 100;
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%`;
  };

  const GrowthIcon = ({ cur, prev }: { cur: number; prev: number }) => {
    if (prev === 0 || cur === prev) return <Minus className="h-3 w-3 text-muted-foreground" />;
    return cur > prev 
      ? <ArrowUpRight className="h-3 w-3 text-success" /> 
      : <ArrowDownRight className="h-3 w-3 text-destructive" />;
  };

  const rows: { label: string; key: keyof YearPL; isMargin?: boolean; isBold?: boolean; isNegative?: boolean }[] = [
    { label: 'Net Revenue', key: 'netRevenue', isBold: true },
    { label: '− COGS', key: 'cogs', isNegative: true },
    { label: 'Gross Profit', key: 'grossProfit', isBold: true },
    { label: 'Gross Margin %', key: 'grossMarginPct', isMargin: true },
    { label: '− Operating Expenses', key: 'opex', isNegative: true },
    { label: 'EBITDA', key: 'ebitda', isBold: true },
    { label: 'EBITDA Margin %', key: 'ebitdaMarginPct', isMargin: true },
    { label: 'Net Profit', key: 'netProfit', isBold: true },
    { label: 'Net Margin %', key: 'netMarginPct', isMargin: true },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Multi-Year P&L Comparison</CardTitle>
        <CardDescription>Consolidated profit &amp; loss — {years[0]}–{years[2]}{years[2] === currentYear ? ' (YTD)' : ''}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(9)].map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
          </div>
        ) : !data ? (
          <p className="text-sm text-muted-foreground">No data available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground w-1/4"></th>
                  {years.map((y, i) => (
                    <th key={y} className="text-right py-2 px-2 font-bold">
                      {y}{y === currentYear ? ' (YTD)' : ''}
                    </th>
                  ))}
                  <th className="text-right py-2 pl-2 font-medium text-muted-foreground text-xs">
                    YoY Growth
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.key}
                    className={`${row.isBold ? 'border-t font-medium' : ''} ${row.isMargin ? 'text-muted-foreground text-xs' : ''}`}
                  >
                    <td className="py-1.5 pr-4">{row.label}</td>
                    {years.map((y) => {
                      const val = data[y]?.[row.key] || 0;
                      return (
                        <td key={y} className={`text-right py-1.5 px-2 ${row.isNegative && val > 0 ? 'text-destructive' : ''} ${row.isBold && val < 0 ? 'text-destructive' : ''}`}>
                          {row.isMargin ? `${(val as number).toFixed(1)}%` : `${row.isNegative ? '−' : ''}${fmtEur(Math.abs(val as number))}`}
                        </td>
                      );
                    })}
                    <td className="text-right py-1.5 pl-2">
                      {!row.isMargin && (
                        <span className="inline-flex items-center gap-0.5 text-xs">
                          <GrowthIcon cur={data[years[2]]?.[row.key] as number || 0} prev={data[years[1]]?.[row.key] as number || 0} />
                          {growthPct(data[years[2]]?.[row.key] as number || 0, data[years[1]]?.[row.key] as number || 0)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
