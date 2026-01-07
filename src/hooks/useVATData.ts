import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VATSummary {
  netRevenue: number;
  grossRevenue: number;
  vatCollected: number;
  vatCollectedPaid: number;
  vatCollectedOutstanding: number;
  invoiceCount: number;
}

export interface VATQuarterData {
  quarter: number;
  periodStart: string;
  periodEnd: string;
  netRevenue: number;
  grossRevenue: number;
  vatCollected: number;
  vatOutstanding: number;
  invoiceCount: number;
  filingStatus: string;
}

const VAT_RATE = 0.21;

export function useVATSummary(year?: number) {
  const currentYear = year || new Date().getFullYear();

  return useQuery({
    queryKey: ['vat-summary', currentYear],
    queryFn: async (): Promise<VATSummary> => {
      const { data: invoices, error } = await supabase
        .from('moneybird_sales_invoices')
        .select('total_amount, net_amount, vat_amount, state_normalized, paid_amount')
        .eq('year', currentYear);

      if (error) throw error;

      let netRevenue = 0;
      let grossRevenue = 0;
      let vatCollected = 0;
      let vatCollectedPaid = 0;
      let vatCollectedOutstanding = 0;

      for (const inv of invoices || []) {
        const total = Number(inv.total_amount) || 0;
        const paid = Number(inv.paid_amount) || 0;
        
        // Calculate net and VAT (use stored values or calculate from gross)
        const net = Number(inv.net_amount) || Math.round(total / 1.21 * 100) / 100;
        const vat = Number(inv.vat_amount) || Math.round((total - net) * 100) / 100;
        
        // Exclude drafts from totals
        if (inv.state_normalized === 'draft' || inv.state_normalized === 'scheduled') {
          continue;
        }

        grossRevenue += total;
        netRevenue += net;
        vatCollected += vat;

        // Calculate VAT portion of paid amount
        if (paid > 0) {
          const paidRatio = paid / total;
          vatCollectedPaid += vat * paidRatio;
        }
      }

      vatCollectedOutstanding = vatCollected - vatCollectedPaid;

      return {
        netRevenue: Math.round(netRevenue * 100) / 100,
        grossRevenue: Math.round(grossRevenue * 100) / 100,
        vatCollected: Math.round(vatCollected * 100) / 100,
        vatCollectedPaid: Math.round(vatCollectedPaid * 100) / 100,
        vatCollectedOutstanding: Math.round(vatCollectedOutstanding * 100) / 100,
        invoiceCount: invoices?.filter(i => 
          i.state_normalized !== 'draft' && i.state_normalized !== 'scheduled'
        ).length || 0,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useVATByQuarter(year?: number) {
  const currentYear = year || new Date().getFullYear();

  return useQuery({
    queryKey: ['vat-by-quarter', currentYear],
    queryFn: async (): Promise<VATQuarterData[]> => {
      const { data: invoices, error } = await supabase
        .from('moneybird_sales_invoices')
        .select('invoice_date, total_amount, net_amount, vat_amount, state_normalized, paid_amount, unpaid_amount')
        .eq('year', currentYear)
        .not('state_normalized', 'in', '("draft","scheduled")');

      if (error) throw error;

      // Initialize quarters
      const quarters: VATQuarterData[] = [1, 2, 3, 4].map(q => ({
        quarter: q,
        periodStart: `${currentYear}-${String((q - 1) * 3 + 1).padStart(2, '0')}-01`,
        periodEnd: `${currentYear}-${String(q * 3).padStart(2, '0')}-${q === 1 || q === 4 ? '31' : q === 2 ? '30' : '30'}`,
        netRevenue: 0,
        grossRevenue: 0,
        vatCollected: 0,
        vatOutstanding: 0,
        invoiceCount: 0,
        filingStatus: q < Math.ceil((new Date().getMonth() + 1) / 3) ? 'pending' : 'future',
      }));

      for (const inv of invoices || []) {
        if (!inv.invoice_date) continue;
        
        const month = new Date(inv.invoice_date).getMonth() + 1;
        const quarterIndex = Math.ceil(month / 3) - 1;
        
        if (quarterIndex < 0 || quarterIndex > 3) continue;

        const total = Number(inv.total_amount) || 0;
        const net = Number(inv.net_amount) || Math.round(total / 1.21 * 100) / 100;
        const vat = Number(inv.vat_amount) || Math.round((total - net) * 100) / 100;
        const unpaid = Number(inv.unpaid_amount) || 0;

        quarters[quarterIndex].grossRevenue += total;
        quarters[quarterIndex].netRevenue += net;
        quarters[quarterIndex].vatCollected += vat;
        quarters[quarterIndex].invoiceCount++;
        
        // VAT portion of outstanding
        if (unpaid > 0) {
          const unpaidRatio = unpaid / total;
          quarters[quarterIndex].vatOutstanding += vat * unpaidRatio;
        }
      }

      // Round values
      return quarters.map(q => ({
        ...q,
        netRevenue: Math.round(q.netRevenue * 100) / 100,
        grossRevenue: Math.round(q.grossRevenue * 100) / 100,
        vatCollected: Math.round(q.vatCollected * 100) / 100,
        vatOutstanding: Math.round(q.vatOutstanding * 100) / 100,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}
