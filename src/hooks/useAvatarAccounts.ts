import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AvatarAccount {
  id: string;
  label: string;
  linkedin_email: string | null;
  status: string;
  owner_team: string | null;
  risk_level: string;
  max_daily_minutes: number;
  notes: string | null;
  playbook: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Enrichment fields
  linkedin_url: string | null;
  avatar_url: string | null;
  connections_count: number | null;
  followers_count: number | null;
  linkedin_headline: string | null;
  email_account_address: string | null;
  last_synced_at: string | null;
}

export function useAvatarAccounts() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const accountsQuery = useQuery({
    queryKey: ['avatar-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('linkedin_avatar_accounts')
        .select('*')
        .order('label');
      if (error) throw error;
      return data as AvatarAccount[];
    },
    enabled: !!user,
  });

  const createAccount = useMutation({
    mutationFn: async (account: Partial<AvatarAccount>) => {
      const payload = { ...account, created_by: user?.id } as any;
      const { data, error } = await supabase
        .from('linkedin_avatar_accounts')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avatar-accounts'] });
      toast.success('Account added.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateAccount = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AvatarAccount> & { id: string }) => {
      const { error } = await supabase
        .from('linkedin_avatar_accounts')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avatar-accounts'] });
      toast.success('Account updated.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const syncLinkedIn = useMutation({
    mutationFn: async ({ accountId, linkedinUrl }: { accountId: string; linkedinUrl: string }) => {
      const { data, error } = await supabase.functions.invoke('sync-avatar-linkedin', {
        body: { accountId, linkedinUrl },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avatar-accounts'] });
      toast.success('LinkedIn profile synced.');
    },
    onError: (e: Error) => toast.error(`Sync failed: ${e.message}`),
  });

  const saveCredentials = useMutation({
    mutationFn: async (payload: {
      accountId: string;
      linkedinPassword?: string;
      emailAccountAddress?: string;
      emailAccountPassword?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('avatar-account-credentials', {
        body: payload,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('Credentials saved securely.');
    },
    onError: (e: Error) => toast.error(`Save failed: ${e.message}`),
  });

  return { ...accountsQuery, createAccount, updateAccount, syncLinkedIn, saveCredentials };
}
