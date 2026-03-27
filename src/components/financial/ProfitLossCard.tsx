import { useTranslation } from 'react-i18next';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/revenueCalculations";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { grossToNet, vatFromGross } from "@/lib/vatRates";

interface ProfitLossCardProps {
  year?: number;
  legalEntity?: string;
}

function usePLData(year: number, legalEntity?: string) {
  const startOfYear = `${year}-01-01`;
  return useQuery({
    queryKey: ['profit-loss-summary', year, legalEntity],
    queryFn: async () => {
      let query = supabase
        .from('moneybird_sales_invoices')
        .select('total_amount, net_amount, vat_amount, state_normalized')
        .gte('invoice_date', startOfYear);

      if (legalEntity && legalEntity !== 'all') {
        query = query.eq('legal_entity', legalEntity);
      }

      const { data: invoices } = await query;

      const netRevenue = invoices?.reduce((sum, inv) => 
        sum + (Number(inv.net_amount) || grossToNet(Number(inv.total_amount)) || 0), 0) || 0;
      const vatCollected = invoices?.reduce((sum, inv) => 
        sum + (Number(inv.vat_amount) || vatFromGross(Number(inv.total_amount)) || 0), 0) || 0;
      const grossRevenue = invoices?.reduce((sum, inv) => 
        sum + (Number(inv.total_amount) || 0), 0) || 0;

      // Filter expenses by entity when applicable
      let commsQuery = supabase.from('employee_commissions').select('gross_amount').gte('created_at', startOfYear);
      if (legalEntity && legalEntity !== 'all') commsQuery = commsQuery.eq('legal_entity', legalEntity);
      const { data: commissions } = await commsQuery;
      const totalCommissions = commissions?.reduce((sum, c) => sum + (c.gross_amount || 0), 0) || 0;

      let payoutsQuery = supabase.from('referral_payouts').select('payout_amount').gte('created_at', startOfYear);
      if (legalEntity && legalEntity !== 'all') payoutsQuery = payoutsQuery.eq('legal_entity', legalEntity);
      const { data: payouts } = await payoutsQuery;
      const totalPayouts = payouts?.reduce((sum, p) => sum + (p.payout_amount || 0), 0) || 0;

      let expQuery = supabase.from('operating_expenses').select('amount, amount_eur').gte('expense_date', startOfYear);
      if (legalEntity && legalEntity !== 'all') expQuery = expQuery.eq('legal_entity', legalEntity);
      const { data: expenses } = await expQuery;
      const totalOtherExpenses = expenses?.reduce((sum, e) => sum + (Number(e.amount_eur ?? e.amount) || 0), 0) || 0;

      let subsQuery = supabase.from('vendor_subscriptions').select('monthly_cost, monthly_cost_eur, contract_start_date, status').eq('status', 'active');
      if (legalEntity && legalEntity !== 'all') subsQuery = subsQuery.eq('legal_entity', legalEntity);
      const { data: subscriptions } = await subsQuery;

      const now = new Date();
      const yearStart = new Date(year, 0, 1);
      // Cap to year-end for historical years to prevent overcounting
      const yearEnd = new Date(year, 11, 31);
      const effectiveNow = now < yearEnd ? now : yearEnd;
      const monthsElapsed = (effectiveNow.getFullYear() - yearStart.getFullYear()) * 12 + 
                           (effectiveNow.getMonth() - yearStart.getMonth()) + 1;
      
      const totalSubscriptionCosts = subscriptions?.reduce((sum, sub) => {
        const startDate = new Date(sub.contract_start_date);
        const effectiveStart = startDate > yearStart ? startDate : yearStart;
        const monthsActive = Math.max(0, 
          (effectiveNow.getFullYear() - effectiveStart.getFullYear()) * 12 + 
          (effectiveNow.getMonth() - effectiveStart.getMonth()) + 1
        );
        const costEur = (sub as any).monthly_cost_eur ?? sub.monthly_cost;
        return sum + (costEur * Math.min(monthsActive, monthsElapsed));
      }, 0) || 0;

      const totalExpenses = totalOtherExpenses + totalSubscriptionCosts;
      const grossMargin = netRevenue - totalCommissions - totalPayouts;
      const netProfit = grossMargin - totalExpenses;
      const grossMarginPercent = netRevenue > 0 ? (grossMargin / netRevenue) * 100 : 0;
      const netMarginPercent = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

      return {
        netRevenue,
        grossRevenue,
        vatCollected,
        totalCommissions,
        totalPayouts,
        totalOtherExpenses,
        totalSubscriptionCosts,
        totalExpenses,
        grossMargin,
        netProfit,
        grossMarginPercent,
        netMarginPercent,
      };
    },
  });
}

export function ProfitLossCard({ year, legalEntity }: ProfitLossCardProps) {
  const { t } = useTranslation('common');
  const currentYear = year || new Date().getFullYear();
  const { data, isLoading } = usePLData(currentYear, legalEntity);
  const { data: priorData, isLoading: priorLoading } = usePLData(currentYear - 1, legalEntity);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40" />
        </CardContent>
      </Card>
    );
  }

  const profitStatus = data?.netProfit && data.netProfit > 0 
    ? 'positive' 
    : data?.netProfit && data.netProfit < 0 
      ? 'negative' 
      : 'neutral';

  // YoY calculation
  const yoyRevenueChange = priorData && priorData.netRevenue > 0
    ? ((data?.netRevenue || 0) - priorData.netRevenue) / priorData.netRevenue * 100
    : null;
  const yoyProfitChange = priorData && priorData.netProfit !== 0
    ? ((data?.netProfit || 0) - priorData.netProfit) / Math.abs(priorData.netProfit) * 100
    : null;

  const YoYBadge = ({ value, label }: { value: number | null; label: string }) => {
    if (value === null || priorLoading) return null;
    const isPositive = value >= 0;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`text-xs font-medium ml-2 ${isPositive ? 'text-success' : 'text-destructive'}`}>
              {isPositive ? '↑' : '↓'}{Math.abs(value).toFixed(0)}% YoY
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{label}: {formatCurrency(priorData?.netRevenue || 0)} in {currentYear - 1}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{t('financial.profitLossSummary')}</span>
          <div className={`flex items-center gap-1 text-sm font-normal ${
            profitStatus === 'positive' ? 'text-success' : 
            profitStatus === 'negative' ? 'text-destructive' : 
            'text-muted-foreground'
          }`}>
            {profitStatus === 'positive' && <TrendingUp className="h-4 w-4" />}
            {profitStatus === 'negative' && <TrendingDown className="h-4 w-4" />}
            {profitStatus === 'neutral' && <Minus className="h-4 w-4" />}
            {data?.netMarginPercent?.toFixed(1)}% margin
          </div>
        </CardTitle>
        <CardDescription>{t('financial.ytdPerformance')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Net Revenue (excl. VAT) */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t('financial.netRevenueExclVAT')}
              <YoYBadge value={yoyRevenueChange} label={t('financial.priorYearRevenue')} />
            </span>
            <span className="font-medium">{formatCurrency(data?.netRevenue || 0)}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Gross: {formatCurrency(data?.grossRevenue || 0)} incl. €{((data?.vatCollected || 0) / 1000).toFixed(1)}k VAT
          </div>
          <Progress value={100} className="h-2" />
        </div>

        {/* Deductions */}
        <div className="pl-4 border-l-2 border-muted space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('financial.recruiterCommissions')}</span>
            <span className="text-destructive">-{formatCurrency(data?.totalCommissions || 0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('financial.referralPayouts')}</span>
            <span className="text-destructive">-{formatCurrency(data?.totalPayouts || 0)}</span>
          </div>
        </div>

        {/* Gross Margin */}
        <div className="pt-2 border-t">
          <div className="flex justify-between">
            <span className="font-medium">{t('financial.grossMargin')}</span>
            <span className={`font-bold ${
              (data?.grossMargin || 0) >= 0 ? 'text-success' : 'text-destructive'
            }`}>
              {formatCurrency(data?.grossMargin || 0)}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {data?.grossMarginPercent?.toFixed(1)}% of revenue
          </div>
        </div>

        {/* Operating Expenses */}
        <div className="pl-4 border-l-2 border-muted space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('financial.saasSubscriptions')}</span>
            <span className="text-destructive">-{formatCurrency(data?.totalSubscriptionCosts || 0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('financial.otherOperatingExpenses')}</span>
            <span className="text-destructive">-{formatCurrency(data?.totalOtherExpenses || 0)}</span>
          </div>
        </div>

        {/* Net Profit */}
        <div className="pt-2 border-t bg-muted/30 -mx-6 px-6 py-3 rounded-b-lg">
          <div className="flex justify-between items-center">
            <span className="font-bold text-lg">
              {t('financial.netProfit')}
              <YoYBadge value={yoyProfitChange} label={t('financial.priorYearProfit')} />
            </span>
            <span className={`font-bold text-xl ${
              (data?.netProfit || 0) >= 0 ? 'text-success' : 'text-destructive'
            }`}>
              {formatCurrency(data?.netProfit || 0)}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {t('financial.afterAllDistributions')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
