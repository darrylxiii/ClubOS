import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MoneybirdSettings {
  id: string;
  user_id: string;
  administration_id: string;
  administration_name: string | null;
  auto_create_invoices: boolean;
  auto_send_invoices: boolean;
  default_tax_rate_id: string | null;
  sync_preferences: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface MoneybirdContactSync {
  id: string;
  company_id: string;
  moneybird_contact_id: string;
  sync_status: string;
  last_synced_at: string;
  sync_error: string | null;
}

interface MoneybirdInvoiceSync {
  id: string;
  partner_invoice_id: string;
  moneybird_invoice_id: string;
  moneybird_status: string;
  external_url: string | null;
  sync_status: string;
  last_synced_at: string;
  sync_error: string | null;
}

interface MoneybirdSyncLog {
  id: string;
  user_id: string | null;
  operation_type: string;
  entity_type: string;
  entity_id: string | null;
  success: boolean;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
}

// Fetch Moneybird settings
export function useMoneybirdSettings() {
  return useQuery({
    queryKey: ['moneybird-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('moneybird_settings')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data as MoneybirdSettings | null;
    },
  });
}

// Fetch sync logs
export function useMoneybirdSyncLogs(limit = 20) {
  return useQuery({
    queryKey: ['moneybird-sync-logs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('moneybird_sync_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as MoneybirdSyncLog[];
    },
  });
}

// Fetch contact sync status
export function useMoneybirdContactSyncs() {
  return useQuery({
    queryKey: ['moneybird-contact-syncs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('moneybird_contact_sync')
        .select('*, companies(name)')
        .order('last_synced_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

// Fetch invoice sync status
export function useMoneybirdInvoiceSyncs() {
  return useQuery({
    queryKey: ['moneybird-invoice-syncs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('moneybird_invoice_sync')
        .select('*, partner_invoices(invoice_number, total_amount, status)')
        .order('last_synced_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

// Get OAuth authorization URL
export function useGetMoneybirdAuthUrl() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('moneybird-auth', {
        body: null,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      // Check for function-level error (non-2xx response)
      if (response.error) {
        throw new Error(response.error.message || 'Failed to get auth URL');
      }

      // Append action parameter to URL
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/moneybird-auth?action=authorize`;
      const authResponse = await fetch(functionUrl, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!authResponse.ok) {
        throw new Error('Failed to get authorization URL');
      }

      const data = await authResponse.json();
      return data.authUrl as string;
    },
    onError: (error) => {
      toast.error('Failed to initiate Moneybird connection', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

// Disconnect from Moneybird
export function useDisconnectMoneybird() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('moneybird-auth', {
        body: { action: 'disconnect' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to disconnect');
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moneybird-settings'] });
      toast.success('Moneybird disconnected');
    },
    onError: (error) => {
      toast.error('Failed to disconnect', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

// Update settings
export function useUpdateMoneybirdSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: { auto_create_invoices?: boolean; auto_send_invoices?: boolean }) => {
      const { data: currentSettings } = await supabase
        .from('moneybird_settings')
        .select('id')
        .eq('is_active', true)
        .single();

      if (!currentSettings) throw new Error('No active settings found');

      const { error } = await supabase
        .from('moneybird_settings')
        .update({
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentSettings.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moneybird-settings'] });
      toast.success('Settings updated');
    },
    onError: (error) => {
      toast.error('Failed to update settings', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

// Sync contacts
export function useSyncMoneybirdContacts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params?: { companyId?: string; syncAll?: boolean }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('moneybird-sync-contacts', {
        body: params || {},
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Sync failed');
      }

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['moneybird-contact-syncs'] });
      queryClient.invalidateQueries({ queryKey: ['moneybird-sync-logs'] });
      toast.success('Contact sync completed', {
        description: `Created: ${data.results.created}, Updated: ${data.results.updated}`,
      });
    },
    onError: (error) => {
      toast.error('Contact sync failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

// Create invoice in Moneybird
export function useCreateMoneybirdInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      partnerInvoiceId: string;
      companyId: string;
      amount: number;
      description: string;
      invoiceNumber?: string;
      dueDate?: string;
      countryCode?: string;
      vatNumber?: string;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('moneybird-create-invoice', {
        body: params,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create invoice');
      }

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['moneybird-invoice-syncs'] });
      queryClient.invalidateQueries({ queryKey: ['moneybird-sync-logs'] });
      toast.success('Invoice created in Moneybird', {
        description: 'View it in your Moneybird administration',
        action: data.externalUrl ? {
          label: 'Open',
          onClick: () => window.open(data.externalUrl, '_blank'),
        } : undefined,
      });
    },
    onError: (error) => {
      toast.error('Failed to create invoice', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

// Sync invoice statuses
export function useSyncMoneybirdInvoiceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params?: { partnerInvoiceId?: string; syncAll?: boolean }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('moneybird-sync-invoice-status', {
        body: params || {},
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Sync failed');
      }

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['moneybird-invoice-syncs'] });
      queryClient.invalidateQueries({ queryKey: ['moneybird-sync-logs'] });
      queryClient.invalidateQueries({ queryKey: ['partner-invoices'] });
      toast.success('Invoice status sync completed', {
        description: `Checked: ${data.results.checked}, Updated: ${data.results.updated}, Paid: ${data.results.paid}`,
      });
    },
    onError: (error) => {
      toast.error('Invoice status sync failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}
