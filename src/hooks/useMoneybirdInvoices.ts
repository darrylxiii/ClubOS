import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MoneybirdInvoice {
  id: string;
  moneybird_id: string;
  invoice_number: string | null;
  contact_id: string | null;
  contact_name: string | null;
  state_raw: string | null;
  state_normalized: string;
  invoice_date: string | null;
  due_date: string | null;
  paid_at: string | null;
  total_amount: number;
  paid_amount: number;
  unpaid_amount: number;
  net_amount: number;
  vat_amount: number;
  vat_rate: number | null;
  vat_type: string | null;
  currency: string;
  year: number;
  created_at: string;
  updated_at: string;
}

export function useMoneybirdInvoices(year?: number) {
  const currentYear = year || new Date().getFullYear();

  return useQuery({
    queryKey: ['moneybird-invoices', currentYear],
    queryFn: async (): Promise<MoneybirdInvoice[]> => {
      const { data, error } = await supabase
        .from('moneybird_sales_invoices')
        .select('*')
        .eq('year', currentYear)
        .order('invoice_date', { ascending: false });

      if (error) throw error;
      return (data || []).map(i => ({ ...i, currency: i.currency ?? 'EUR' }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useInvoiceStatusCounts(year?: number) {
  const { data: invoices } = useMoneybirdInvoices(year);

  return invoices?.reduce((acc, inv) => {
    const state = inv.state_normalized || 'unknown';
    if (!acc[state]) {
      acc[state] = { count: 0, amount: 0 };
    }
    acc[state].count++;
    acc[state].amount += Number(inv.total_amount) || 0;
    return acc;
  }, {} as Record<string, { count: number; amount: number }>) || {};
}
