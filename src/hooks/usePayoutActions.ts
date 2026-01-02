import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type PayoutAction = 'approve' | 'reject' | 'mark_paid';

interface PayoutActionParams {
  payoutId: string;
  action: PayoutAction;
  rejectionReason?: string;
  paymentReference?: string;
}

export const usePayoutActions = () => {
  const queryClient = useQueryClient();

  const approvePayout = useMutation({
    mutationFn: async ({ payoutId, action, rejectionReason, paymentReference }: PayoutActionParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke('approve-referral-payout', {
        body: {
          payout_id: payoutId,
          action,
          approved_by: user?.id,
          rejection_reason: rejectionReason,
          payment_reference: paymentReference,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['referral-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['financial-stats'] });
      queryClient.invalidateQueries({ queryKey: ['referral-earnings'] });
      
      const actionText = variables.action === 'approve' 
        ? 'approved' 
        : variables.action === 'reject' 
          ? 'rejected' 
          : 'marked as paid';
      toast.success(`Payout ${actionText} successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to process payout: ${error.message}`);
    },
  });

  return {
    approvePayout: (payoutId: string) => 
      approvePayout.mutate({ payoutId, action: 'approve' }),
    rejectPayout: (payoutId: string, reason?: string) => 
      approvePayout.mutate({ payoutId, action: 'reject', rejectionReason: reason }),
    markPaid: (payoutId: string, paymentReference?: string) => 
      approvePayout.mutate({ payoutId, action: 'mark_paid', paymentReference }),
    isLoading: approvePayout.isPending,
  };
};
