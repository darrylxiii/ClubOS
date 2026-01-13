import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { financeService } from '@/services/financeService';

interface MoneybirdConnectionStatus {
  connected: boolean;
  administrationId?: string;
  administrationName?: string;
  country?: string;
  currency?: string;
  error?: string;
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

// Test connection to Moneybird
export function useMoneybirdConnection() {
  return useQuery({
    queryKey: ['moneybird-connection'],
    queryFn: async () => {
      const response = await financeService.testConnection();

      if (response.error || response.connected === false) {
        return { connected: false, error: response.error || 'Connection failed' } as MoneybirdConnectionStatus;
      }

      return response as MoneybirdConnectionStatus;
    },
    staleTime: 60000, // Cache for 1 minute
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

// Sync contacts
export function useSyncMoneybirdContacts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params?: { companyId?: string; syncAll?: boolean }) => {
      const response = await financeService.syncContacts(params || {});

      if (!response.success) {
        throw new Error(response.error || 'Sync failed');
      }

      return response;
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
      const response = await financeService.createInvoice(params);

      if (!response.success) {
        // financeService throws on error usually if configured that way, but let's handle the response object
        throw new Error(response.error || 'Failed to create invoice');
      }

      return response;
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
      const response = await financeService.syncInvoiceStatus(params || {});

      if (!response.success) {
        throw new Error(response.error || 'Sync failed');
      }

      return response;
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
