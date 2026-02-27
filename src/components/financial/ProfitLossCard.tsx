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

      const { data: commissions } = await supabase
        .from('employee_commissions')
        .select('gross_amount')
        .gte('created_at', startOfYear);
      const totalCommissions = commissions?.reduce((sum, c) => sum + (c.gross_amount || 0), 0) || 0;

      const { data: payouts } = await supabase
        .from('referral_payouts')
        .select('payout_amount')
        .gte('created_at', startOfYear);
      const totalPayouts = payouts?.reduce((sum, p) => sum + (p.payout_amount || 0), 0) || 0;

      const { data: expenses } = await supabase
        .from('operating_expenses')
        .select('amount, amount_eur')
        .gte('expense_date', startOfYear);
      const totalOtherExpenses = expenses?.reduce((sum, e) => sum + (Number(e.amount_eur ?? e.amount) || 0), 0) || 0;

      const { data: subscriptions } = await supabase
        .from('vendor_subscriptions')
        .select('monthly_cost, monthly_cost_eur, contract_start_date, status')
        .eq('status', 'active');

      const now = new Date();
      const yearStart = new Date(year, 0, 1);
      const monthsElapsed = (now.getFullYear() - yearStart.getFullYear()) * 12 + 
                           (now.getMonth() - yearStart.getMonth()) + 1;
      
      const totalSubscriptionCosts = subscriptions?.reduce((sum, sub) => {
        const startDate = new Date(sub.contract_start_date);
        const effectiveStart = startDate > yearStart ? startDate : yearStart;
        const monthsActive = Math.max(0, 
          (now.getFullYear() - effectiveStart.getFullYear()) * 12 + 
          (now.getMonth() - effectiveStart.getMonth()) + 1
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
          <span>Profit & Loss Summary</span>
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
        <CardDescription>Year-to-date financial performance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Net Revenue (excl. VAT) */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Net Revenue (excl. VAT)
              <YoYBadge value={yoyRevenueChange} label="Prior year revenue" />
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
            <span className="text-muted-foreground">Recruiter Commissions</span>
            <span className="text-destructive">-{formatCurrency(data?.totalCommissions || 0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Referral Payouts</span>
            <span className="text-destructive">-{formatCurrency(data?.totalPayouts || 0)}</span>
          </div>
        </div>

        {/* Gross Margin */}
        <div className="pt-2 border-t">
          <div className="flex justify-between">
            <span className="font-medium">Gross Margin</span>
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
            <span className="text-muted-foreground">SaaS & Subscriptions</span>
            <span className="text-destructive">-{formatCurrency(data?.totalSubscriptionCosts || 0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Other Operating Expenses</span>
            <span className="text-destructive">-{formatCurrency(data?.totalOtherExpenses || 0)}</span>
          </div>
        </div>

        {/* Net Profit */}
        <div className="pt-2 border-t bg-muted/30 -mx-6 px-6 py-3 rounded-b-lg">
          <div className="flex justify-between items-center">
            <span className="font-bold text-lg">
              Net Profit
              <YoYBadge value={yoyProfitChange} label="Prior year profit" />
            </span>
            <span className={`font-bold text-xl ${
              (data?.netProfit || 0) >= 0 ? 'text-success' : 'text-destructive'
            }`}>
              {formatCurrency(data?.netProfit || 0)}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            After all distributions and operating expenses
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
