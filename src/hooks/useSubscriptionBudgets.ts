import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SubscriptionBudget {
  id: string;
  category: string;
  budget_amount: number;
  period_type: string;
  year: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useSubscriptionBudgets(year?: number) {
  const currentYear = year || new Date().getFullYear();
  return useQuery({
    queryKey: ['subscription-budgets', currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_budgets')
        .select('*')
        .eq('year', currentYear)
        .order('category');
      if (error) throw error;
      return data as SubscriptionBudget[];
    },
  });
}

export function useUpsertSubscriptionBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<SubscriptionBudget, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: result, error } = await supabase
        .from('subscription_budgets')
        .upsert(data, { onConflict: 'category,year' })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-budgets'] });
      toast.success('Budget saved');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save budget: ${error.message}`);
    },
  });
}

export function useCostIntelligence() {
  return useQuery({
    queryKey: ['cost-intelligence'],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();
      const startOfYear = `${currentYear}-01-01`;

      const [subsResult, expensesResult, feesResult, revenueResult] = await Promise.all([
        supabase.from('vendor_subscriptions').select('monthly_cost, annual_cost, seats_licensed, seats_used, category, business_criticality, status, next_renewal_date').eq('status', 'active'),
        supabase.from('operating_expenses').select('amount').gte('expense_date', startOfYear),
        supabase.from('placement_fees').select('fee_amount, status'),
        supabase.from('moneybird_sales_invoices').select('net_amount, total_amount').gte('invoice_date', startOfYear),
      ]);

      const subscriptions = subsResult.data || [];
      const expenses = expensesResult.data || [];
      const fees = feesResult.data || [];
      const invoices = revenueResult.data || [];

      const totalMRC = subscriptions.reduce((s, sub) => s + (sub.monthly_cost || 0), 0);
      const totalARC = totalMRC * 12;
      const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
      const totalOperatingCosts = totalExpenses + totalMRC * ((new Date().getMonth()) + 1);
      const placementCount = fees.filter(f => f.status === 'paid' || f.status === 'invoiced').length || 1;
      const netRevenue = invoices.reduce((s, inv) => s + (Number(inv.net_amount) || Number(inv.total_amount) / 1.21 || 0), 0);

      const costPerPlacement = totalOperatingCosts / placementCount;
      const costPerRevenueEuro = netRevenue > 0 ? totalOperatingCosts / netRevenue : 0;
      const costToRevenuePercent = netRevenue > 0 ? (totalOperatingCosts / netRevenue) * 100 : 0;

      // Health score
      let utilizationScore = 0;
      let subsWithSeats = 0;
      subscriptions.forEach(sub => {
        if (sub.seats_licensed && sub.seats_used) {
          subsWithSeats++;
          utilizationScore += (sub.seats_used / sub.seats_licensed) * 100;
        }
      });
      if (subsWithSeats > 0) utilizationScore = utilizationScore / subsWithSeats;
      else utilizationScore = 75; // neutral if no seat data

      const healthScore = Math.min(100, Math.round(utilizationScore * 0.3 + 70 * 0.2 + 80 * 0.2 + 75 * 0.15 + 70 * 0.15));

      // Savings opportunities
      const underutilized = subscriptions.filter(s => s.seats_licensed && s.seats_used && (s.seats_used / s.seats_licensed) < 0.5);
      const categoryMap: Record<string, number> = {};
      subscriptions.forEach(s => {
        categoryMap[s.category] = (categoryMap[s.category] || 0) + 1;
      });
      const duplicateCategories = Object.entries(categoryMap).filter(([, count]) => count > 1).map(([cat]) => cat);

      const now = new Date();
      const sixtyDays = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      const renewingSoon = subscriptions.filter(s => s.next_renewal_date && new Date(s.next_renewal_date) <= sixtyDays && new Date(s.next_renewal_date) >= now);

      return {
        totalMRC,
        totalARC,
        totalOperatingCosts,
        costPerPlacement,
        costPerRevenueEuro,
        costToRevenuePercent,
        healthScore,
        netRevenue,
        placementCount,
        savingsOpportunities: {
          underutilized: underutilized.length,
          duplicateCategories,
          renewingSoon: renewingSoon.length,
        },
        activeSubscriptionCount: subscriptions.length,
      };
    },
    staleTime: 60_000,
  });
}

export function useGenerateExpensesFromSubscriptions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const expenseDate = `${year}-${String(month).padStart(2, '0')}-01`;

      // Get active subscriptions
      const { data: subs, error: subsError } = await supabase
        .from('vendor_subscriptions')
        .select('id, vendor_name, monthly_cost, category, operating_expense_category_id')
        .eq('status', 'active');
      if (subsError) throw subsError;

      // Check which already have an expense for this month
      const { data: existing } = await supabase
        .from('operating_expenses')
        .select('vendor_subscription_id')
        .eq('expense_date', expenseDate)
        .not('vendor_subscription_id', 'is', null);

      const existingIds = new Set((existing || []).map(e => (e as any).vendor_subscription_id));
      const toInsert = (subs || [])
        .filter(s => !existingIds.has(s.id) && s.monthly_cost > 0)
        .map(s => ({
          description: `SaaS: ${s.vendor_name}`,
          amount: s.monthly_cost,
          expense_date: expenseDate,
          category_id: s.operating_expense_category_id || null,
          category_name: s.category || 'SaaS',
          is_recurring: true,
          vendor: s.vendor_name,
        }));

      if (toInsert.length === 0) {
        return { inserted: 0 };
      }

      const { error } = await supabase.from('operating_expenses').insert(toInsert);
      if (error) throw error;
      return { inserted: toInsert.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['operating-expenses'] });
      toast.success(`Generated ${data.inserted} expense entries from subscriptions`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate expenses: ${error.message}`);
    },
  });
}
