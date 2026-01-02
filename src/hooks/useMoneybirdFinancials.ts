import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

      // Parse JSONB fields
      return {
        ...data,
        revenue_by_month: (data.revenue_by_month as unknown as MonthlyRevenue[]) || [],
        top_clients: (data.top_clients as unknown as TopClient[]) || [],
        payment_aging: (data.payment_aging as unknown as PaymentAging) || {
          current: 0,
          overdue_30: 0,
          overdue_60: 0,
          overdue_90: 0,
          overdue_90_plus: 0,
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
      const { data, error } = await supabase.functions.invoke('moneybird-fetch-financials', {
        body: { year: year || new Date().getFullYear() },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Sync failed');
      
      return data.data;
    },
    onSuccess: (data) => {
      toast.success('Financial data synced successfully');
      queryClient.invalidateQueries({ queryKey: ['moneybird-financials'] });
    },
    onError: (error) => {
      console.error('Sync failed:', error);
      toast.error(`Failed to sync financial data: ${error.message}`);
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
