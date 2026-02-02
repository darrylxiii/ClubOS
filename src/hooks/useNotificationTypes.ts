import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface NotificationType {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  default_enabled: boolean;
  allow_user_override: boolean;
  priority: 'low' | 'normal' | 'high' | 'critical';
  edge_function: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationTypeWithAssignments extends NotificationType {
  assignment_count: number;
  role_assignments: string[];
}

export function useNotificationTypes() {
  return useQuery({
    queryKey: ['email-notification-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_notification_types')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as NotificationType[];
    },
  });
}

export function useNotificationTypesWithAssignments() {
  return useQuery({
    queryKey: ['email-notification-types-with-assignments'],
    queryFn: async () => {
      // Get all notification types
      const { data: types, error: typesError } = await supabase
        .from('email_notification_types')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (typesError) throw typesError;

      // Get all assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('email_notification_assignments')
        .select('*');

      if (assignmentsError) throw assignmentsError;

      // Combine the data
      const typesWithAssignments = (types || []).map((type) => {
        const typeAssignments = (assignments || []).filter(
          (a) => a.notification_type_id === type.id && a.is_enabled
        );
        const roleAssignments = typeAssignments
          .filter((a) => a.assignment_type === 'role' && a.role)
          .map((a) => a.role as string);

        return {
          ...type,
          priority: type.priority as 'low' | 'normal' | 'high' | 'critical',
          assignment_count: typeAssignments.length,
          role_assignments: roleAssignments,
        };
      });

      return typesWithAssignments as NotificationTypeWithAssignments[];
    },
  });
}

export function useUpdateNotificationType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<NotificationType>;
    }) => {
      const { data, error } = await supabase
        .from('email_notification_types')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-notification-types'] });
      queryClient.invalidateQueries({ queryKey: ['email-notification-types-with-assignments'] });
      toast.success('Notification type updated');
    },
    onError: (error) => {
      toast.error('Failed to update notification type');
      console.error('Update error:', error);
    },
  });
}

export function useCreateNotificationType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newType: Omit<NotificationType, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('email_notification_types')
        .insert(newType)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-notification-types'] });
      queryClient.invalidateQueries({ queryKey: ['email-notification-types-with-assignments'] });
      toast.success('Notification type created');
    },
    onError: (error) => {
      toast.error('Failed to create notification type');
      console.error('Create error:', error);
    },
  });
}

export const NOTIFICATION_CATEGORIES = [
  { key: 'applications', label: 'Applications', color: 'blue' },
  { key: 'bookings', label: 'Bookings & Meetings', color: 'purple' },
  { key: 'security', label: 'Security', color: 'red' },
  { key: 'system', label: 'System', color: 'gray' },
  { key: 'communications', label: 'Communications', color: 'green' },
  { key: 'approvals', label: 'Approvals', color: 'amber' },
] as const;

export const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'text-muted-foreground', bgColor: 'bg-muted' },
  normal: { label: 'Normal', color: 'text-foreground', bgColor: 'bg-secondary' },
  high: { label: 'High', color: 'text-warning', bgColor: 'bg-warning/10' },
  critical: { label: 'Critical', color: 'text-destructive', bgColor: 'bg-destructive/10' },
} as const;
