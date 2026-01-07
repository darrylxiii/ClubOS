import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface VendorSubscription {
  id: string;
  vendor_name: string;
  vendor_website: string | null;
  vendor_logo_url: string | null;
  category: string;
  contract_start_date: string;
  contract_end_date: string | null;
  billing_cycle: string;
  next_billing_date: string | null;
  next_renewal_date: string | null;
  auto_renewal: boolean;
  cancellation_notice_days: number;
  monthly_cost: number;
  annual_cost: number;
  currency: string;
  payment_method: string | null;
  seats_licensed: number | null;
  seats_used: number | null;
  department: string | null;
  primary_owner_id: string | null;
  business_criticality: string;
  expected_bank_reference: string | null;
  linked_bank_account: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendorSubscriptionFormData {
  vendor_name: string;
  vendor_website?: string;
  vendor_logo_url?: string;
  category: string;
  contract_start_date: string;
  contract_end_date?: string;
  billing_cycle: string;
  next_billing_date?: string;
  next_renewal_date?: string;
  auto_renewal: boolean;
  cancellation_notice_days: number;
  monthly_cost: number;
  currency: string;
  payment_method?: string;
  seats_licensed?: number;
  seats_used?: number;
  department?: string;
  primary_owner_id?: string;
  business_criticality: string;
  expected_bank_reference?: string;
  linked_bank_account?: string;
  status: string;
  notes?: string;
}

export interface SubscriptionMetrics {
  totalMRC: number;
  totalARC: number;
  activeCount: number;
  upcomingRenewals: number;
  byCategory: Record<string, { count: number; mrc: number }>;
  byDepartment: Record<string, { count: number; mrc: number }>;
  underutilized: number;
}

export function useVendorSubscriptions(status?: string) {
  return useQuery({
    queryKey: ['vendor-subscriptions', status],
    queryFn: async () => {
      let query = supabase
        .from('vendor_subscriptions')
        .select('*')
        .order('monthly_cost', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as VendorSubscription[];
    },
  });
}

export function useSubscriptionMetrics() {
  const { data: subscriptions } = useVendorSubscriptions('active');

  const metrics: SubscriptionMetrics = {
    totalMRC: 0,
    totalARC: 0,
    activeCount: 0,
    upcomingRenewals: 0,
    byCategory: {},
    byDepartment: {},
    underutilized: 0,
  };

  if (subscriptions) {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    subscriptions.forEach((sub) => {
      metrics.totalMRC += sub.monthly_cost;
      metrics.totalARC += sub.annual_cost;
      metrics.activeCount++;

      // Check upcoming renewals
      if (sub.next_renewal_date) {
        const renewalDate = new Date(sub.next_renewal_date);
        if (renewalDate <= thirtyDaysFromNow && renewalDate >= now) {
          metrics.upcomingRenewals++;
        }
      }

      // By category
      if (!metrics.byCategory[sub.category]) {
        metrics.byCategory[sub.category] = { count: 0, mrc: 0 };
      }
      metrics.byCategory[sub.category].count++;
      metrics.byCategory[sub.category].mrc += sub.monthly_cost;

      // By department
      const dept = sub.department || 'Unassigned';
      if (!metrics.byDepartment[dept]) {
        metrics.byDepartment[dept] = { count: 0, mrc: 0 };
      }
      metrics.byDepartment[dept].count++;
      metrics.byDepartment[dept].mrc += sub.monthly_cost;

      // Underutilized check
      if (sub.seats_licensed && sub.seats_used) {
        const utilization = sub.seats_used / sub.seats_licensed;
        if (utilization < 0.5) {
          metrics.underutilized++;
        }
      }
    });
  }

  return metrics;
}

export function useCreateVendorSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: VendorSubscriptionFormData) => {
      const { data: result, error } = await supabase
        .from('vendor_subscriptions')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-subscriptions'] });
      toast.success('Subscription added successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add subscription: ${error.message}`);
    },
  });
}

export function useUpdateVendorSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<VendorSubscriptionFormData> }) => {
      const { data: result, error } = await supabase
        .from('vendor_subscriptions')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-subscriptions'] });
      toast.success('Subscription updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update subscription: ${error.message}`);
    },
  });
}

export function useDeleteVendorSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vendor_subscriptions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-subscriptions'] });
      toast.success('Subscription deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete subscription: ${error.message}`);
    },
  });
}
