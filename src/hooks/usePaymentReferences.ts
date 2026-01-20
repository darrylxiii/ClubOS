import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PaymentReference {
  id: string;
  reference_code: string;
  invoice_id: string | null;
  company_id: string | null;
  amount: number | null;
  currency: string;
  created_at: string;
}

interface GenerateReferenceParams {
  companyId: string;
  companyCode: string;
  invoiceId?: string;
  amount?: number;
}

/**
 * Generates a structured payment reference in format: TQC-{CODE}-{YYMM}{SEQ}
 * Example: TQC-ACME-260112 (ACME, January 2026, 12th reference)
 */
function generateReferenceCode(companyCode: string, sequence: number): string {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  const seq = sequence.toString().padStart(2, '0');
  
  return `TQC-${companyCode.toUpperCase()}-${yy}${mm}${seq}`;
}

export function usePaymentReferences(companyId?: string) {
  return useQuery({
    queryKey: ['payment-references', companyId],
    queryFn: async (): Promise<PaymentReference[]> => {
      let query = supabase
        .from('payment_references')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      
      const { data, error } = await query.limit(100);
      
      if (error) throw error;
      return data || [];
    },
    enabled: true,
  });
}

export function useGeneratePaymentReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ companyId, companyCode, invoiceId, amount }: GenerateReferenceParams): Promise<PaymentReference> => {
      // Get current count for this month to generate sequence
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
      
      const { count, error: countError } = await supabase
        .from('payment_references')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd);
      
      if (countError) throw countError;
      
      const sequence = (count || 0) + 1;
      const referenceCode = generateReferenceCode(companyCode, sequence);
      
      const { data, error } = await supabase
        .from('payment_references')
        .insert({
          reference_code: referenceCode,
          company_id: companyId,
          invoice_id: invoiceId || null,
          amount: amount || null,
          currency: 'EUR',
        })
        .select()
        .single();
      
      if (error) {
        // Handle unique constraint violation (race condition)
        if (error.code === '23505') {
          // Retry with incremented sequence
          const retryCode = generateReferenceCode(companyCode, sequence + 1);
          const { data: retryData, error: retryError } = await supabase
            .from('payment_references')
            .insert({
              reference_code: retryCode,
              company_id: companyId,
              invoice_id: invoiceId || null,
              amount: amount || null,
              currency: 'EUR',
            })
            .select()
            .single();
          
          if (retryError) throw retryError;
          return retryData;
        }
        throw error;
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-references'] });
      toast.success('Payment reference generated');
    },
    onError: (error: Error) => {
      console.error('Failed to generate payment reference:', error);
      toast.error('Failed to generate payment reference');
    },
  });
}

export function useCopyPaymentReference() {
  return useMutation({
    mutationFn: async (referenceCode: string) => {
      await navigator.clipboard.writeText(referenceCode);
      return referenceCode;
    },
    onSuccess: (referenceCode) => {
      toast.success(`Copied: ${referenceCode}`);
    },
    onError: () => {
      toast.error('Failed to copy to clipboard');
    },
  });
}