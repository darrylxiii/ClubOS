import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/revenueCalculations";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ProfitLossCardProps {
  year?: number;
}

export function ProfitLossCard({ year }: ProfitLossCardProps) {
  const currentYear = year || new Date().getFullYear();
  const startOfYear = `${currentYear}-01-01`;

  const { data, isLoading } = useQuery({
    queryKey: ['profit-loss-summary', currentYear],
    queryFn: async () => {
      // Fetch revenue from Moneybird - use net_amount for true revenue (excl. VAT)
      const { data: invoices } = await supabase
        .from('moneybird_sales_invoices')
        .select('total_amount, net_amount, vat_amount, state_normalized')
        .gte('invoice_date', startOfYear);

      // Net revenue (excluding 21% VAT) - this is our actual revenue
      const netRevenue = invoices?.reduce((sum, inv) => 
        sum + (Number(inv.net_amount) || Number(inv.total_amount) / 1.21 || 0), 0) || 0;
      
      // VAT collected (liability to tax authority)
      const vatCollected = invoices?.reduce((sum, inv) => 
        sum + (Number(inv.vat_amount) || Number(inv.total_amount) - Number(inv.total_amount) / 1.21 || 0), 0) || 0;
      
      // Gross for reference
      const grossRevenue = invoices?.reduce((sum, inv) => 
        sum + (Number(inv.total_amount) || 0), 0) || 0;

      // Fetch commissions
      const { data: commissions } = await supabase
        .from('employee_commissions')
        .select('gross_amount')
        .gte('created_at', startOfYear);

      const totalCommissions = commissions?.reduce((sum, c) => 
        sum + (c.gross_amount || 0), 0) || 0;

      // Fetch referral payouts
      const { data: payouts } = await supabase
        .from('referral_payouts')
        .select('payout_amount')
        .gte('created_at', startOfYear);

      const totalPayouts = payouts?.reduce((sum, p) => 
        sum + (p.payout_amount || 0), 0) || 0;

      // Fetch operating expenses (non-subscription)
      const { data: expenses } = await supabase
        .from('operating_expenses')
        .select('amount')
        .gte('expense_date', startOfYear);

      const totalOtherExpenses = expenses?.reduce((sum, e) => 
        sum + (e.amount || 0), 0) || 0;

      // Fetch SaaS subscription costs (active subscriptions, annualized for YTD)
      const { data: subscriptions } = await supabase
        .from('vendor_subscriptions')
        .select('monthly_cost, contract_start_date, status')
        .eq('status', 'active');

      // Calculate subscription costs YTD
      const now = new Date();
      const yearStart = new Date(currentYear, 0, 1);
      const monthsElapsed = (now.getFullYear() - yearStart.getFullYear()) * 12 + 
                           (now.getMonth() - yearStart.getMonth()) + 1;
      
      const totalSubscriptionCosts = subscriptions?.reduce((sum, sub) => {
        // Calculate months active in current year
        const startDate = new Date(sub.contract_start_date);
        const effectiveStart = startDate > yearStart ? startDate : yearStart;
        const monthsActive = Math.max(0, 
          (now.getFullYear() - effectiveStart.getFullYear()) * 12 + 
          (now.getMonth() - effectiveStart.getMonth()) + 1
        );
        return sum + (sub.monthly_cost * Math.min(monthsActive, monthsElapsed));
      }, 0) || 0;

      const totalExpenses = totalOtherExpenses + totalSubscriptionCosts;

      // Calculate margins based on NET revenue (excluding VAT)
      const grossMargin = netRevenue - totalCommissions - totalPayouts;
      const netProfit = grossMargin - totalExpenses;
      const grossMarginPercent = netRevenue > 0 ? (grossMargin / netRevenue) * 100 : 0;
      const netMarginPercent = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

      return {
        netRevenue,
        grossRevenue, // For reference/tooltip
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
            <span className="text-muted-foreground">Net Revenue (excl. VAT)</span>
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
            <span className="font-bold text-lg">Net Profit</span>
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
