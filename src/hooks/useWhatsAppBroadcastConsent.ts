import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notify';

export interface BroadcastConsent {
  id: string;
  candidate_id: string | null;
  phone_number: string;
  consent_status: 'opted_in' | 'opted_out' | 'unknown';
  consent_source: string | null;
  consent_given_at: string | null;
  consent_revoked_at: string | null;
  last_campaign_sent_at: string | null;
  campaign_send_count: number;
  created_at: string;
  updated_at: string;
}

export function useWhatsAppBroadcastConsent(phoneNumber?: string) {
  const queryClient = useQueryClient();

  // Fetch single consent by phone
  const { data: consent, isLoading: loadingConsent } = useQuery({
    queryKey: ['whatsapp-consent', phoneNumber],
    queryFn: async () => {
      if (!phoneNumber) return null;
      const { data, error } = await supabase
        .from('whatsapp_broadcast_consent')
        .select('*')
        .eq('phone_number', phoneNumber)
        .maybeSingle();
      if (error) throw error;
      return data as BroadcastConsent | null;
    },
    enabled: !!phoneNumber,
  });

  // Fetch all consents with stats
  const { data: allConsents, isLoading: loadingAll } = useQuery({
    queryKey: ['whatsapp-consent-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_broadcast_consent')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data || []) as BroadcastConsent[];
    },
  });

  // Compute stats
  const stats = {
    total: allConsents?.length || 0,
    optedIn: allConsents?.filter(c => c.consent_status === 'opted_in').length || 0,
    optedOut: allConsents?.filter(c => c.consent_status === 'opted_out').length || 0,
    unknown: allConsents?.filter(c => c.consent_status === 'unknown').length || 0,
  };

  // Update or create consent
  const updateConsentMutation = useMutation({
    mutationFn: async ({
      phone,
      status,
      source,
      candidateId,
    }: {
      phone: string;
      status: 'opted_in' | 'opted_out' | 'unknown';
      source?: string;
      candidateId?: string;
    }) => {
      const now = new Date().toISOString();
      const consentData = {
        phone_number: phone,
        consent_status: status,
        consent_source: source || 'manual',
        candidate_id: candidateId || null,
        consent_given_at: status === 'opted_in' ? now : null,
        consent_revoked_at: status === 'opted_out' ? now : null,
        updated_at: now,
      };

      const { data, error } = await supabase
        .from('whatsapp_broadcast_consent')
        .upsert(consentData, { onConflict: 'phone_number' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-consent'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-consent-all'] });
      notify.success('Consent updated');
    },
    onError: (error) => {
      notify.error('Failed to update consent', { description: error.message });
    },
  });

  // Bulk update consents
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({
      phoneNumbers,
      status,
      source,
    }: {
      phoneNumbers: string[];
      status: 'opted_in' | 'opted_out';
      source?: string;
    }) => {
      const now = new Date().toISOString();
      const records = phoneNumbers.map(phone => ({
        phone_number: phone,
        consent_status: status,
        consent_source: source || 'bulk_import',
        consent_given_at: status === 'opted_in' ? now : null,
        consent_revoked_at: status === 'opted_out' ? now : null,
        updated_at: now,
      }));

      const { error } = await supabase
        .from('whatsapp_broadcast_consent')
        .upsert(records, { onConflict: 'phone_number' });

      if (error) throw error;
      return records.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-consent'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-consent-all'] });
      notify.success(`Updated ${count} consent records`);
    },
    onError: (error) => {
      notify.error('Bulk update failed', { description: error.message });
    },
  });

  // Get opted-in phone numbers for campaigns
  const getOptedInPhones = async (): Promise<string[]> => {
    const { data, error } = await supabase
      .from('whatsapp_broadcast_consent')
      .select('phone_number')
      .eq('consent_status', 'opted_in');
    
    if (error) {
      console.error('Error fetching opted-in phones:', error);
      return [];
    }
    return data.map(d => d.phone_number);
  };

  return {
    consent,
    allConsents,
    stats,
    loading: loadingConsent || loadingAll,
    updateConsent: updateConsentMutation.mutate,
    bulkUpdate: bulkUpdateMutation.mutate,
    isUpdating: updateConsentMutation.isPending || bulkUpdateMutation.isPending,
    getOptedInPhones,
  };
}
