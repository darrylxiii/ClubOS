import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { addDays, differenceInDays, parseISO } from "date-fns";

interface ForecastPeriod {
  label: string;
  days: number;
  expectedCollections: number;
  expectedPayouts: number;
  pipelineRevenue: number;
  netCashFlow: number;
  invoiceCount: number;
  pipelineDealsCount: number;
}

interface RevenueForecasting {
  periods: ForecastPeriod[];
  totalOutstanding: number;
  avgDSO: number;
  unpaidCount: number;
  pendingCommissions: number;
  pendingPayouts: number;
  pipelineTotal: number;
  pipelineDealsCount: number;
  isLoading: boolean;
}

// Stage-based probability for deal pipeline
const STAGE_PROBABILITIES: Record<string, number> = {
  'lead': 0.1,
  'qualified': 0.25,
  'proposal': 0.4,
  'negotiation': 0.6,
  'contract': 0.8,
  'closed_won': 1.0,
  'closed_lost': 0,
};

export function useRevenueForecasting(year?: number, includePipeline: boolean = true): RevenueForecasting {
  const currentYear = year || new Date().getFullYear();
  const today = new Date();

  const { data, isLoading } = useQuery({
    queryKey: ['revenue-forecasting', currentYear, includePipeline],
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

      // Fetch pipeline data from placement_fees if included
      let pipelineDeals: any[] = [];
      if (includePipeline) {
        const { data: fees } = await supabase
          .from('placement_fees')
          .select('fee_amount, status, created_at')
          .in('status', ['pending', 'invoiced']);
        pipelineDeals = fees || [];
      }

      const monthlyRecurringExpenses = recentExpenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

      // Calculate projections for 30/60/90 days
      const periods: ForecastPeriod[] = [30, 60, 90].map(days => {
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

        // Expected payouts (commissions + referrals + recurring)
        const expectedPayouts = (
          (pendingCommissions?.reduce((sum, c) => sum + (c.gross_amount || 0), 0) || 0) +
          (pendingPayouts?.reduce((sum, p) => sum + (p.payout_amount || 0), 0) || 0) +
          (monthlyRecurringExpenses * (days / 30))
        );

        // Pipeline revenue from pending placement fees
        let pipelineRevenue = 0;
        let pipelineDealsInPeriod = 0;
        
        if (includePipeline) {
          pipelineDeals.forEach(fee => {
            // Pending fees expected within period - probability based on status
            const probability = fee.status === 'invoiced' ? 0.9 : 0.6;
            pipelineRevenue += (fee.fee_amount || 0) * probability;
            pipelineDealsInPeriod++;
          });
        }

        return {
          label: `${days} Days`,
          days,
          expectedCollections: collectionsInPeriod,
          expectedPayouts: expectedPayouts,
          pipelineRevenue,
          netCashFlow: collectionsInPeriod + pipelineRevenue - expectedPayouts,
          invoiceCount: unpaidInvoices?.length || 0,
          pipelineDealsCount: pipelineDealsInPeriod,
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

      // Total pipeline value from pending fees
      const pipelineTotal = pipelineDeals.reduce((sum, fee) => {
        const prob = fee.status === 'invoiced' ? 0.9 : 0.6;
        return sum + (fee.fee_amount || 0) * prob;
      }, 0);

      return {
        periods,
        totalOutstanding,
        avgDSO: Math.round(avgDSO),
        unpaidCount: unpaidInvoices?.length || 0,
        pendingCommissions: pendingCommissions?.reduce((sum, c) => sum + (c.gross_amount || 0), 0) || 0,
        pendingPayouts: pendingPayouts?.reduce((sum, p) => sum + (p.payout_amount || 0), 0) || 0,
        pipelineTotal,
        pipelineDealsCount: pipelineDeals.length,
      };
    },
  });

  return {
    periods: data?.periods || [],
    totalOutstanding: data?.totalOutstanding || 0,
    avgDSO: data?.avgDSO || 0,
    unpaidCount: data?.unpaidCount || 0,
    pendingCommissions: data?.pendingCommissions || 0,
    pendingPayouts: data?.pendingPayouts || 0,
    pipelineTotal: data?.pipelineTotal || 0,
    pipelineDealsCount: data?.pipelineDealsCount || 0,
    isLoading,
  };
}
