import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/revenueCalculations";
import { TrendingUp, TrendingDown, DollarSign, Clock, AlertTriangle } from "lucide-react";
import { addDays, format, differenceInDays, parseISO } from "date-fns";

interface CashFlowProjectionProps {
  year?: number;
}

interface ProjectionPeriod {
  label: string;
  expectedCollections: number;
  expectedPayouts: number;
  netCashFlow: number;
  invoiceCount: number;
}

export function CashFlowProjection({ year }: CashFlowProjectionProps) {
  const currentYear = year || new Date().getFullYear();
  const today = new Date();

  const { data, isLoading } = useQuery({
    queryKey: ['cash-flow-projection', currentYear],
    queryFn: async () => {
      // Fetch unpaid invoices for AR forecast
      const { data: unpaidInvoices } = await supabase
        .from('moneybird_sales_invoices')
        .select('total_amount, invoice_date, due_date, state_normalized')
        .in('state_normalized', ['open', 'late', 'pending'])
        .gte('invoice_date', `${currentYear}-01-01`);

      // Fetch pending commissions
      const { data: pendingCommissions } = await supabase
        .from('employee_commissions')
        .select('gross_amount, created_at')
        .eq('status', 'pending')
        .gte('created_at', `${currentYear}-01-01`);

      // Fetch pending payouts
      const { data: pendingPayouts } = await supabase
        .from('referral_payouts')
        .select('payout_amount, created_at')
        .eq('status', 'pending')
        .gte('created_at', `${currentYear}-01-01`);

      // Fetch recurring expenses (monthly average)
      const { data: recentExpenses } = await supabase
        .from('operating_expenses')
        .select('amount, is_recurring')
        .eq('is_recurring', true);

      const monthlyRecurringExpenses = recentExpenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

      // Calculate projections for 30/60/90 days
      const periods: ProjectionPeriod[] = [30, 60, 90].map(days => {
        const periodEnd = addDays(today, days);
        
        // Weight collections by aging (older = less likely to collect)
        const collectionsInPeriod = unpaidInvoices?.reduce((sum, inv) => {
          const dueDate = inv.due_date ? parseISO(inv.due_date) : parseISO(inv.invoice_date);
          const daysOverdue = differenceInDays(today, dueDate);
          
          // Payment probability based on age
          let probability = 1.0;
          if (daysOverdue > 90) probability = 0.3;
          else if (daysOverdue > 60) probability = 0.5;
          else if (daysOverdue > 30) probability = 0.7;
          else if (daysOverdue > 0) probability = 0.85;
          
          return sum + (Number(inv.total_amount) || 0) * probability;
        }, 0) || 0;

        // Expected payouts (commissions + referrals)
        const expectedPayouts = (
          (pendingCommissions?.reduce((sum, c) => sum + (c.gross_amount || 0), 0) || 0) +
          (pendingPayouts?.reduce((sum, p) => sum + (p.payout_amount || 0), 0) || 0) +
          (monthlyRecurringExpenses * (days / 30))
        );

        return {
          label: `${days} Days`,
          expectedCollections: collectionsInPeriod,
          expectedPayouts: expectedPayouts,
          netCashFlow: collectionsInPeriod - expectedPayouts,
          invoiceCount: unpaidInvoices?.length || 0,
        };
      });

      // Total outstanding AR
      const totalOutstanding = unpaidInvoices?.reduce((sum, inv) => 
        sum + (Number(inv.total_amount) || 0), 0) || 0;

      // Days Sales Outstanding (DSO)
      const { data: paidInvoices } = await supabase
        .from('moneybird_sales_invoices')
        .select('invoice_date, paid_at')
        .eq('state_normalized', 'paid')
        .gte('invoice_date', `${currentYear}-01-01`)
        .not('paid_at', 'is', null);

      const avgDSO = paidInvoices?.length ? 
        paidInvoices.reduce((sum, inv) => {
          const invoiceDate = parseISO(inv.invoice_date);
          const paidDate = parseISO(inv.paid_at!);
          return sum + differenceInDays(paidDate, invoiceDate);
        }, 0) / paidInvoices.length : 0;

      return {
        periods,
        totalOutstanding,
        avgDSO: Math.round(avgDSO),
        unpaidCount: unpaidInvoices?.length || 0,
        pendingCommissions: pendingCommissions?.reduce((sum, c) => sum + (c.gross_amount || 0), 0) || 0,
        pendingPayouts: pendingPayouts?.reduce((sum, p) => sum + (p.payout_amount || 0), 0) || 0,
      };
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Cash Flow Projection
        </CardTitle>
        <CardDescription>
          30/60/90 day forecast based on outstanding invoices and pending obligations
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Key Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              Outstanding AR
            </div>
            <p className="text-xl font-bold">{formatCurrency(data?.totalOutstanding || 0)}</p>
            <p className="text-xs text-muted-foreground">{data?.unpaidCount} invoices</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              Avg DSO
            </div>
            <p className="text-xl font-bold">{data?.avgDSO || 0} days</p>
            <p className="text-xs text-muted-foreground">Days to collect</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <AlertTriangle className="h-4 w-4" />
              Pending Commissions
            </div>
            <p className="text-xl font-bold">{formatCurrency(data?.pendingCommissions || 0)}</p>
            <p className="text-xs text-muted-foreground">To be paid</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <AlertTriangle className="h-4 w-4" />
              Pending Payouts
            </div>
            <p className="text-xl font-bold">{formatCurrency(data?.pendingPayouts || 0)}</p>
            <p className="text-xs text-muted-foreground">Referral rewards</p>
          </div>
        </div>

        {/* 30/60/90 Day Projections */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data?.periods.map((period) => (
            <div
              key={period.label}
              className="border rounded-lg p-4 space-y-3"
            >
              <h4 className="font-semibold text-center">{period.label}</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Expected Collections</span>
                  <span className="font-medium text-success">
                    +{formatCurrency(period.expectedCollections)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Expected Payouts</span>
                  <span className="font-medium text-destructive">
                    -{formatCurrency(period.expectedPayouts)}
                  </span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Net Cash Flow</span>
                    <span className={`font-bold flex items-center gap-1 ${
                      period.netCashFlow >= 0 ? 'text-success' : 'text-destructive'
                    }`}>
                      {period.netCashFlow >= 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      {formatCurrency(period.netCashFlow)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
