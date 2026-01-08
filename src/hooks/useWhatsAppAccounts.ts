import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notify';

export interface WhatsAppAccount {
  id: string;
  business_account_id: string;
  phone_number_id: string;
  display_phone_number: string;
  verified_name: string | null;
  is_active: boolean;
  is_primary?: boolean;
  account_label?: string | null;
  account_type?: string | null;
  verification_status?: string | null;
  last_verified_at?: string | null;
  created_at: string;
  updated_at: string;
}

async function fetchAllAccounts(): Promise<WhatsAppAccount[]> {
  const { data, error } = await supabase
    .from('whatsapp_business_accounts')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  // Sort by is_primary in JS to avoid complex query
  const accounts = (data || []) as unknown as WhatsAppAccount[];
  return accounts.sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));
}

async function fetchActiveAccount(): Promise<WhatsAppAccount | null> {
  const { data, error } = await supabase
    .from('whatsapp_business_accounts')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  if (!data || data.length === 0) return null;
  
  const accounts = data as unknown as WhatsAppAccount[];
  // Prefer primary account
  const primary = accounts.find(a => a.is_primary);
  return primary || accounts[0];
}

export function useWhatsAppAccounts() {
  return useQuery({
    queryKey: ['whatsapp-accounts-all'],
    queryFn: fetchAllAccounts,
  });
}

export function useActiveWhatsAppAccount() {
  return useQuery({
    queryKey: ['whatsapp-account-active'],
    queryFn: fetchActiveAccount,
  });
}

export function useManageWhatsAppAccount() {
  const queryClient = useQueryClient();

  const createAccount = useMutation({
    mutationFn: async (data: {
      phone_number_id: string;
      business_account_id: string;
      display_phone_number: string;
      account_label?: string;
      access_token?: string;
    }) => {
      const { data: result, error } = await supabase.functions.invoke('manage-whatsapp-account', {
        body: { action: 'create', ...data }
      });
      if (error) throw error;
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts-all'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-account-active'] });
      notify.success('WhatsApp account added successfully');
    },
    onError: (error: Error) => {
      notify.error(error.message || 'Failed to add account');
    },
  });

  const updateAccount = useMutation({
    mutationFn: async (data: {
      account_id: string;
      account_label?: string;
      is_active?: boolean;
    }) => {
      const { data: result, error } = await supabase.functions.invoke('manage-whatsapp-account', {
        body: { action: 'update', ...data }
      });
      if (error) throw error;
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts-all'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-account-active'] });
      notify.success('Account updated');
    },
    onError: (error: Error) => {
      notify.error(error.message || 'Failed to update account');
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async (accountId: string) => {
      const { data: result, error } = await supabase.functions.invoke('manage-whatsapp-account', {
        body: { action: 'delete', account_id: accountId }
      });
      if (error) throw error;
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts-all'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-account-active'] });
      notify.success('Account removed');
    },
    onError: (error: Error) => {
      notify.error(error.message || 'Failed to remove account');
    },
  });

  const setPrimary = useMutation({
    mutationFn: async (accountId: string) => {
      const { data: result, error } = await supabase.functions.invoke('manage-whatsapp-account', {
        body: { action: 'set-primary', account_id: accountId }
      });
      if (error) throw error;
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts-all'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-account-active'] });
      notify.success('Primary account updated');
    },
    onError: (error: Error) => {
      notify.error(error.message || 'Failed to set primary account');
    },
  });

  const verifyConnection = useMutation({
    mutationFn: async (accountId: string) => {
      const { data: result, error } = await supabase.functions.invoke('manage-whatsapp-account', {
        body: { action: 'verify', account_id: accountId }
      });
      if (error) throw error;
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts-all'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-account-active'] });
      if (data.verified) {
        notify.success('Connection verified successfully');
      } else {
        notify.error('Connection verification failed');
      }
    },
    onError: (error: Error) => {
      notify.error(error.message || 'Failed to verify connection');
    },
  });

  return {
    createAccount,
    updateAccount,
    deleteAccount,
    setPrimary,
    verifyConnection,
  };
}
