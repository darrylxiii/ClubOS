/**
 * Unified Financial Data Hook
 * Consolidates all financial data fetching with consistent caching
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ============= Types =============

export interface MoneybirdInvoice {
  id: string;
  contact_id: string | null;
  contact_name: string | null;
  invoice_id?: string | null;
  invoice_number?: string | null;
  invoice_date: string | null;
  due_date: string | null;
  paid_at: string | null;
  state?: string | null;
  state_normalized: string | null;
  total_amount: number | null;
  currency: string | null;
  year: number | null;
  company_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Additional fields from DB
  application_id?: string | null;
  reference?: string | null;
}

export interface FinancialStats {
  totalPlacementRevenue: number;
  paidPlacementRevenue: number;
  pendingFees: number;
  outstandingInvoices: number;
  overdueInvoices: number;
  pendingPayouts: number;
  pendingPayoutCount: number;
}

export interface PaymentAging {
  current: number;
  overdue_30: number;
  overdue_60: number;
  overdue_90: number;
  overdue_90_plus: number;
}

export interface InvoiceStatusCounts {
  draft: number;
  open: number;
  pending: number;
  late: number;
  paid: number;
  cancelled: number;
  total: number;
}

// ============= Query Keys =============

export const FINANCIAL_QUERY_KEYS = {
  all: ["financial"] as const,
  invoices: (year: number) => [...FINANCIAL_QUERY_KEYS.all, "invoices", year] as const,
  stats: () => [...FINANCIAL_QUERY_KEYS.all, "stats"] as const,
  aging: (year: number) => [...FINANCIAL_QUERY_KEYS.all, "aging", year] as const,
  statusCounts: (year: number) => [...FINANCIAL_QUERY_KEYS.all, "status-counts", year] as const,
  metrics: (year: number) => [...FINANCIAL_QUERY_KEYS.all, "metrics", year] as const,
  forecasting: (year: number, includePipeline: boolean) => 
    [...FINANCIAL_QUERY_KEYS.all, "forecasting", year, includePipeline] as const,
};

// ============= Base Invoice Hook =============

export function useInvoices(year?: number) {
  const currentYear = year || new Date().getFullYear();

  return useQuery({
    queryKey: FINANCIAL_QUERY_KEYS.invoices(currentYear),
    queryFn: async (): Promise<MoneybirdInvoice[]> => {
      const { data, error } = await supabase
        .from("moneybird_sales_invoices")
        .select("*")
        .eq("year", currentYear)
        .order("invoice_date", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============= Invoice Status Counts Hook =============

export function useInvoiceStatusCounts(year?: number) {
  const currentYear = year || new Date().getFullYear();

  return useQuery({
    queryKey: FINANCIAL_QUERY_KEYS.statusCounts(currentYear),
    queryFn: async (): Promise<InvoiceStatusCounts> => {
      const { data, error } = await supabase
        .from("moneybird_sales_invoices")
        .select("state_normalized")
        .eq("year", currentYear);

      if (error) throw error;

      const counts: InvoiceStatusCounts = {
        draft: 0,
        open: 0,
        pending: 0,
        late: 0,
        paid: 0,
        cancelled: 0,
        total: 0,
      };

      data?.forEach((inv) => {
        counts.total++;
        const state = inv.state_normalized?.toLowerCase() || "pending";
        if (state in counts) {
          counts[state as keyof Omit<InvoiceStatusCounts, "total">]++;
        }
      });

      return counts;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ============= Payment Aging Hook =============

export function usePaymentAging(year?: number) {
  const currentYear = year || new Date().getFullYear();
  const today = new Date();

  return useQuery({
    queryKey: FINANCIAL_QUERY_KEYS.aging(currentYear),
    queryFn: async (): Promise<PaymentAging> => {
      const { data, error } = await supabase
        .from("moneybird_sales_invoices")
        .select("total_amount, due_date, state_normalized")
        .eq("year", currentYear)
        .in("state_normalized", ["open", "late", "pending"]);

      if (error) throw error;

      const aging: PaymentAging = {
        current: 0,
        overdue_30: 0,
        overdue_60: 0,
        overdue_90: 0,
        overdue_90_plus: 0,
      };

      data?.forEach((inv) => {
        const amount = Number(inv.total_amount) || 0;
        if (!inv.due_date) {
          aging.current += amount;
          return;
        }

        const dueDate = new Date(inv.due_date);
        const daysOverdue = Math.floor(
          (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysOverdue <= 0) {
          aging.current += amount;
        } else if (daysOverdue <= 30) {
          aging.overdue_30 += amount;
        } else if (daysOverdue <= 60) {
          aging.overdue_60 += amount;
        } else if (daysOverdue <= 90) {
          aging.overdue_90 += amount;
        } else {
          aging.overdue_90_plus += amount;
        }
      });

      return aging;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ============= Financial Stats Hook =============

export function useFinancialStats() {
  return useQuery({
    queryKey: FINANCIAL_QUERY_KEYS.stats(),
    queryFn: async (): Promise<FinancialStats> => {
      const [feesResult, invoicesResult, payoutsResult] = await Promise.all([
        supabase.from("placement_fees").select("fee_amount, status"),
        supabase.from("partner_invoices").select("total_amount, status"),
        supabase.from("referral_payouts").select("payout_amount, status"),
      ]);

      if (feesResult.error) throw feesResult.error;
      if (invoicesResult.error) throw invoicesResult.error;
      if (payoutsResult.error) throw payoutsResult.error;

      const fees = feesResult.data || [];
      const invoices = invoicesResult.data || [];
      const payouts = payoutsResult.data || [];

      return {
        totalPlacementRevenue: fees.reduce(
          (sum, fee) => sum + (fee.fee_amount || 0),
          0
        ),
        paidPlacementRevenue: fees
          .filter((fee) => fee.status === "paid")
          .reduce((sum, fee) => sum + (fee.fee_amount || 0), 0),
        pendingFees: fees.filter((fee) => fee.status === "pending").length,
        outstandingInvoices: invoices
          .filter((inv) => inv.status !== "paid" && inv.status !== "cancelled")
          .reduce((sum, inv) => sum + (inv.total_amount || 0), 0),
        overdueInvoices: invoices.filter((inv) => inv.status === "overdue")
          .length,
        pendingPayouts: payouts
          .filter((p) => p.status === "pending" || p.status === "approved")
          .reduce((sum, p) => sum + (p.payout_amount || 0), 0),
        pendingPayoutCount: payouts.filter((p) => p.status === "pending").length,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ============= Unified Financial Data Hook =============

export interface UnifiedFinancialData {
  invoices: MoneybirdInvoice[];
  stats: FinancialStats;
  aging: PaymentAging;
  statusCounts: InvoiceStatusCounts;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useUnifiedFinancialData(year?: number): UnifiedFinancialData {
  const currentYear = year || new Date().getFullYear();
  const queryClient = useQueryClient();

  const invoicesQuery = useInvoices(currentYear);
  const statsQuery = useFinancialStats();
  const agingQuery = usePaymentAging(currentYear);
  const statusCountsQuery = useInvoiceStatusCounts(currentYear);

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: FINANCIAL_QUERY_KEYS.all });
  };

  return {
    invoices: invoicesQuery.data || [],
    stats: statsQuery.data || {
      totalPlacementRevenue: 0,
      paidPlacementRevenue: 0,
      pendingFees: 0,
      outstandingInvoices: 0,
      overdueInvoices: 0,
      pendingPayouts: 0,
      pendingPayoutCount: 0,
    },
    aging: agingQuery.data || {
      current: 0,
      overdue_30: 0,
      overdue_60: 0,
      overdue_90: 0,
      overdue_90_plus: 0,
    },
    statusCounts: statusCountsQuery.data || {
      draft: 0,
      open: 0,
      pending: 0,
      late: 0,
      paid: 0,
      cancelled: 0,
      total: 0,
    },
    isLoading:
      invoicesQuery.isLoading ||
      statsQuery.isLoading ||
      agingQuery.isLoading ||
      statusCountsQuery.isLoading,
    isError:
      invoicesQuery.isError ||
      statsQuery.isError ||
      agingQuery.isError ||
      statusCountsQuery.isError,
    refetch,
  };
}

// ============= Cache Invalidation Helper =============

export function useInvalidateFinancialData() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: FINANCIAL_QUERY_KEYS.all });
    },
    invalidateInvoices: (year?: number) => {
      if (year) {
        queryClient.invalidateQueries({
          queryKey: FINANCIAL_QUERY_KEYS.invoices(year),
        });
      } else {
        queryClient.invalidateQueries({
          queryKey: [...FINANCIAL_QUERY_KEYS.all, "invoices"],
        });
      }
    },
    invalidateStats: () => {
      queryClient.invalidateQueries({ queryKey: FINANCIAL_QUERY_KEYS.stats() });
    },
  };
}
