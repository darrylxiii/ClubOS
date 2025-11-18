import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PlacementFee {
  id: string;
  application_id: string;
  job_id: string;
  candidate_id: string;
  partner_company_id: string;
  fee_percentage: number;
  candidate_salary: number;
  fee_amount: number;
  currency_code: string;
  status: 'pending' | 'invoiced' | 'paid' | 'cancelled';
  invoice_id: string | null;
  hired_date: string;
  payment_due_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartnerInvoice {
  id: string;
  invoice_number: string;
  partner_company_id: string;
  invoice_date: string;
  due_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  currency_code: string;
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';
  payment_terms_days: number;
  pdf_url: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentTransaction {
  id: string;
  invoice_id: string;
  transaction_date: string;
  amount: number;
  currency_code: string;
  payment_method: 'bank_transfer' | 'stripe' | 'paypal' | 'other';
  payment_reference: string | null;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  notes: string | null;
  created_at: string;
}

export interface ReferralPayout {
  id: string;
  referrer_user_id: string;
  application_id: string;
  payout_amount: number;
  currency_code: string;
  status: 'pending' | 'approved' | 'processing' | 'paid' | 'rejected' | 'cancelled';
  payment_method: string | null;
  approved_at: string | null;
  paid_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export const usePlacementFees = () => {
  return useQuery({
    queryKey: ['placement-fees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('placement_fees')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PlacementFee[];
    },
  });
};

export const usePartnerInvoices = (companyId?: string) => {
  return useQuery({
    queryKey: ['partner-invoices', companyId],
    queryFn: async () => {
      let query = supabase
        .from('partner_invoices')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (companyId) {
        query = query.eq('partner_company_id', companyId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as PartnerInvoice[];
    },
  });
};

export const usePaymentTransactions = () => {
  return useQuery({
    queryKey: ['payment-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PaymentTransaction[];
    },
  });
};

export const useReferralPayouts = () => {
  return useQuery({
    queryKey: ['referral-payouts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_payouts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ReferralPayout[];
    },
  });
};

export const useFinancialStats = () => {
  return useQuery({
    queryKey: ['financial-stats'],
    queryFn: async () => {
      const [feesResult, invoicesResult, payoutsResult] = await Promise.all([
        supabase.from('placement_fees').select('fee_amount, status'),
        supabase.from('partner_invoices').select('total_amount, status'),
        supabase.from('referral_payouts').select('payout_amount, status'),
      ]);

      if (feesResult.error) throw feesResult.error;
      if (invoicesResult.error) throw invoicesResult.error;
      if (payoutsResult.error) throw payoutsResult.error;

      const fees = feesResult.data || [];
      const invoices = invoicesResult.data || [];
      const payouts = payoutsResult.data || [];

      return {
        totalPlacementRevenue: fees.reduce((sum, fee) => sum + (fee.fee_amount || 0), 0),
        paidPlacementRevenue: fees
          .filter(fee => fee.status === 'paid')
          .reduce((sum, fee) => sum + (fee.fee_amount || 0), 0),
        pendingFees: fees.filter(fee => fee.status === 'pending').length,
        outstandingInvoices: invoices
          .filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled')
          .reduce((sum, inv) => sum + (inv.total_amount || 0), 0),
        overdueInvoices: invoices.filter(inv => inv.status === 'overdue').length,
        pendingPayouts: payouts
          .filter(p => p.status === 'pending' || p.status === 'approved')
          .reduce((sum, p) => sum + (p.payout_amount || 0), 0),
        pendingPayoutCount: payouts.filter(p => p.status === 'pending').length,
      };
    },
  });
};
