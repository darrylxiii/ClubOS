import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SMSMessage {
  id: string;
  candidate_id: string | null;
  prospect_id: string | null;
  company_id: string | null;
  phone_number: string;
  direction: 'inbound' | 'outbound';
  content: string | null;
  status: string;
  twilio_sid: string | null;
  sent_at: string | null;
  sentiment_score: number | null;
  created_at: string;
  updated_at: string;
}

interface UseSMSOptions {
  phoneNumber?: string;
  candidateId?: string;
  prospectId?: string;
  companyId?: string;
  limit?: number;
}

export function useSMS(options: UseSMSOptions = {}) {
  const { phoneNumber, candidateId, prospectId, companyId, limit = 50 } = options;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['sms-messages', options],
    queryFn: async () => {
      let q = supabase
        .from('sms_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (phoneNumber) {
        q = q.eq('phone_number', phoneNumber);
      }

      if (candidateId) {
        q = q.eq('candidate_id', candidateId);
      }

      if (prospectId) {
        q = q.eq('prospect_id', prospectId);
      }

      if (companyId) {
        q = q.eq('company_id', companyId);
      }

      const { data, error } = await q;

      if (error) throw error;
      return data as SMSMessage[];
    },
  });

  const sendMutation = useMutation({
    mutationFn: async ({
      to,
      message,
      candidateId,
      prospectId,
      companyId,
    }: {
      to: string;
      message: string;
      candidateId?: string;
      prospectId?: string;
      companyId?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          to,
          message,
          candidate_id: candidateId,
          prospect_id: prospectId,
          company_id: companyId,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('SMS sent successfully');
      queryClient.invalidateQueries({ queryKey: ['sms-messages'] });
    },
    onError: (error: Error) => {
      toast.error('Failed to send SMS', { description: error.message });
    },
  });

  return {
    messages: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    sendSMS: sendMutation.mutate,
    isSending: sendMutation.isPending,
  };
}
