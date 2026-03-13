import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { grossToNet, vatFromGross } from "@/lib/vatRates";
import { LegalEntityFilter } from "@/components/financial/EntitySelector";

export function useFinancialPLSummary(selectedYear: number, legalEntity: LegalEntityFilter = 'all') {
  return useQuery({
    queryKey: ['pl-export-summary', selectedYear, legalEntity],
    queryFn: async () => {
      const startOfYear = `${selectedYear}-01-01`;
      let invQuery = supabase
        .from('moneybird_sales_invoices')
        .select('total_amount, net_amount, vat_amount')
        .gte('invoice_date', startOfYear);
      if (legalEntity !== 'all') invQuery = invQuery.eq('legal_entity', legalEntity);
      const { data: inv } = await invQuery;

      const netRevenue = inv?.reduce((s, i) => s + (Number(i.net_amount) || grossToNet(Number(i.total_amount)) || 0), 0) || 0;
      const vatCollected = inv?.reduce((s, i) => s + (Number(i.vat_amount) || vatFromGross(Number(i.total_amount)) || 0), 0) || 0;
      const grossRevenue = inv?.reduce((s, i) => s + (Number(i.total_amount) || 0), 0) || 0;

      let commsQ = supabase.from('employee_commissions').select('gross_amount').gte('created_at', startOfYear);
      if (legalEntity !== 'all') commsQ = commsQ.eq('legal_entity', legalEntity);
      const { data: comms } = await commsQ;
      const totalCommissions = comms?.reduce((s, c) => s + (c.gross_amount || 0), 0) || 0;

      let paysQ = supabase.from('referral_payouts').select('payout_amount').gte('created_at', startOfYear);
      if (legalEntity !== 'all') paysQ = paysQ.eq('legal_entity', legalEntity);
      const { data: pays } = await paysQ;
      const totalPayouts = pays?.reduce((s, p) => s + (p.payout_amount || 0), 0) || 0;

      let expsQ = supabase.from('operating_expenses').select('amount, amount_eur').gte('expense_date', startOfYear);
      if (legalEntity !== 'all') expsQ = expsQ.eq('legal_entity', legalEntity);
      const { data: exps } = await expsQ;
      const totalOtherExpenses = exps?.reduce((s, e) => s + (Number(e.amount_eur ?? e.amount) || 0), 0) || 0;

      let subsQ = supabase.from('vendor_subscriptions').select('monthly_cost, monthly_cost_eur, contract_start_date, status').eq('status', 'active');
      if (legalEntity !== 'all') subsQ = subsQ.eq('legal_entity', legalEntity);
      const { data: subs } = await subsQ;
      const now = new Date();
      const yearStart = new Date(selectedYear, 0, 1);
      const yearEnd = new Date(selectedYear, 11, 31);
      const effectiveNow = now < yearEnd ? now : yearEnd;
      const monthsElapsed = (effectiveNow.getFullYear() - yearStart.getFullYear()) * 12 + (effectiveNow.getMonth() - yearStart.getMonth()) + 1;
      const totalSubscriptionCosts = subs?.reduce((sum, sub) => {
        const start = new Date(sub.contract_start_date);
        const effective = start > yearStart ? start : yearStart;
        const active = Math.max(0, (effectiveNow.getFullYear() - effective.getFullYear()) * 12 + (effectiveNow.getMonth() - effective.getMonth()) + 1);
        const costEur = (sub as any).monthly_cost_eur ?? sub.monthly_cost;
        return sum + (costEur * Math.min(active, monthsElapsed));
      }, 0) || 0;

      const grossMargin = netRevenue - totalCommissions - totalPayouts;
      const netProfit = grossMargin - totalOtherExpenses - totalSubscriptionCosts;

      return {
        netRevenue, grossRevenue, vatCollected,
        totalCommissions, totalPayouts, totalOtherExpenses, totalSubscriptionCosts,
        grossMargin, netProfit,
        grossMarginPercent: netRevenue > 0 ? (grossMargin / netRevenue) * 100 : 0,
        netMarginPercent: netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0,
      };
    },
  });
}
