import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { financeService } from "@/services/financeService";

interface MonthlyRevenue {
  month: string;
  revenue: number;
  paid: number;
  count: number;
}

interface TopClient {
  contact_id: string;
  name: string;
  revenue: number;
  paid: number;
}

interface PaymentAging {
  current: number;
  overdue_30: number;
  overdue_60: number;
  overdue_90: number;
  overdue_90_plus: number;
}

export interface MoneybirdFinancialMetrics {
  id: string;
  sync_date: string;
  period_start: string;
  period_end: string;
  total_revenue: number;
  total_paid: number;
  total_outstanding: number;
  gross_profit: number;
  invoice_count_paid: number;
  invoice_count_open: number;
  invoice_count_late: number;
  revenue_by_month: MonthlyRevenue[];
  top_clients: TopClient[];
  payment_aging: PaymentAging;
  metadata: Record<string, unknown>;
  last_synced_at: string;
}

export function useMoneybirdFinancials(year?: number) {
  const currentYear = year || new Date().getFullYear();
  const periodStart = `${currentYear}-01-01`;
  const periodEnd = `${currentYear}-12-31`;

  return useQuery({
    queryKey: ['moneybird-financials', currentYear],
    queryFn: async (): Promise<MoneybirdFinancialMetrics | null> => {
      const { data, error } = await supabase
        .from('moneybird_financial_metrics')
        .select('*')
        .eq('period_start', periodStart)
        .eq('period_end', periodEnd)
        .order('sync_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) return null;

      // Parse JSONB fields and ensure non-null numbers
      return {
        ...data,
        total_revenue: data.total_revenue ?? 0,
        total_paid: data.total_paid ?? 0,
        total_outstanding: data.total_outstanding ?? 0,
        gross_profit: data.gross_profit ?? 0,
        invoice_count_open: data.invoice_count_open ?? 0,
        invoice_count_paid: data.invoice_count_paid ?? 0,
        invoice_count_late: data.invoice_count_late ?? 0,
        revenue_by_month: (data.revenue_by_month as unknown as MonthlyRevenue[] || []).map(m => ({
          ...m,
          revenue: m.revenue ?? 0,
          paid: m.paid ?? 0,
          count: m.count ?? 0
        })),
        top_clients: (data.top_clients as unknown as TopClient[] || []).map(c => ({
          ...c,
          revenue: c.revenue ?? 0,
          paid: c.paid ?? 0
        })),
        payment_aging: {
          current: (data.payment_aging as any)?.current ?? 0,
          overdue_30: (data.payment_aging as any)?.overdue_30 ?? 0,
          overdue_60: (data.payment_aging as any)?.overdue_60 ?? 0,
          overdue_90: (data.payment_aging as any)?.overdue_90 ?? 0,
          overdue_90_plus: (data.payment_aging as any)?.overdue_90_plus ?? 0,
        },
        metadata: (data.metadata as Record<string, unknown>) || {},
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSyncMoneybirdFinancials() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (year?: number) => {
      const response = await financeService.fetchFinancials({ year });

      if (!response.success) {
        throw new Error(response.error || 'Sync failed');
      }

      return response.data; // financeService returns { success: true, ...data } but standard invokes returned { data } wrapper often. 
      // Wait, let's check legacy return. Legacy returned { success: true, data: result }. 
      // My new service returns { success: true, ...result } directly? 
      // Let's check `fetch-financials.ts`: returns object with success: true, year, invoices_fetched.
      // Legacy `index.ts` returned { success: true, data: result }.
      // So I need to be careful with the return alignment.
      // New service returns the whole object.
      return response;
    },
    onSuccess: () => {
      toast.success('Financial data synced from Moneybird');
      queryClient.invalidateQueries({ queryKey: ['moneybird-financials'] });
    },
    onError: (error: Error) => {
      console.error('Sync failed:', error);
      toast.error(error.message);
    },
  });
}

export function useRevenueByMonth(year?: number) {
  const { data: metrics } = useMoneybirdFinancials(year);

  return metrics?.revenue_by_month || [];
}

export function useTopClients(year?: number) {
  const { data: metrics } = useMoneybirdFinancials(year);

  return metrics?.top_clients || [];
}

export function usePaymentAging(year?: number) {
  const { data: metrics } = useMoneybirdFinancials(year);

  return metrics?.payment_aging || {
    current: 0,
    overdue_30: 0,
    overdue_60: 0,
    overdue_90: 0,
    overdue_90_plus: 0,
  };
}
