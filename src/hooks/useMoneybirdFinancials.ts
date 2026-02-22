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

export function useMoneybirdFinancials(year?: number, legalEntity?: string) {
  const currentYear = year || new Date().getFullYear();
  const periodStart = `${currentYear}-01-01`;
  const periodEnd = `${currentYear}-12-31`;

  return useQuery({
    queryKey: ['moneybird-financials', currentYear, legalEntity],
    queryFn: async (): Promise<MoneybirdFinancialMetrics | null> => {
      let query = supabase
        .from('moneybird_financial_metrics')
        .select('*')
        .eq('period_start', periodStart)
        .eq('period_end', periodEnd)
        .order('sync_date', { ascending: false })
        .limit(1);

      if (legalEntity && legalEntity !== 'all') {
        query = query.eq('legal_entity', legalEntity);
      }

      const { data, error } = await query.maybeSingle();

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
      const invokeSync = async () => {
        const { data, error } = await supabase.functions.invoke('moneybird-fetch-financials', {
          body: { year: year || new Date().getFullYear() },
        });
        return { data, error };
      };

      let result = await invokeSync();

      // Retry once on cold-start / transient network failures
      if (result.error && (
        result.error.message?.includes('Failed to send') ||
        result.error.message?.includes('FunctionsFetchError')
      )) {
        await new Promise(r => setTimeout(r, 2500));
        result = await invokeSync();
      }

      if (result.error) {
        if (result.error.message?.includes('Failed to send') || result.error.message?.includes('FunctionsFetchError')) {
          throw new Error('Edge Function not available. Please try again in a moment.');
        }
        if (result.error.message?.includes('401') || result.error.message?.includes('Unauthorized')) {
          throw new Error('Moneybird credentials are invalid or missing.');
        }
        throw new Error(result.error.message || 'Failed to connect to sync service');
      }
      
      if (!result.data) {
        throw new Error('No response from sync service');
      }
      
      if (!result.data.success) {
        throw new Error(result.data.error || 'Sync failed');
      }
      
      return result.data.data;
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
