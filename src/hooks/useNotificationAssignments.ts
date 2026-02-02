import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface NotificationAssignment {
  id: string;
  notification_type_id: string;
  assignment_type: 'role' | 'user' | 'all';
  role: string | null;
  user_id: string | null;
  is_enabled: boolean;
  channel: 'email' | 'push' | 'both';
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssignmentWithDetails extends NotificationAssignment {
  notification_type?: {
    key: string;
    name: string;
    category: string;
  };
  user?: {
    full_name: string;
    email: string;
  };
}

export function useNotificationAssignments(notificationTypeId?: string) {
  return useQuery({
    queryKey: ['email-notification-assignments', notificationTypeId],
    queryFn: async () => {
      let query = supabase
        .from('email_notification_assignments')
        .select('*')
        .order('assignment_type', { ascending: true })
        .order('created_at', { ascending: false });

      if (notificationTypeId) {
        query = query.eq('notification_type_id', notificationTypeId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as NotificationAssignment[];
    },
    enabled: true,
  });
}

export function useAssignmentsByRole() {
  return useQuery({
    queryKey: ['email-notification-assignments-by-role'],
    queryFn: async () => {
      const { data: assignments, error } = await supabase
        .from('email_notification_assignments')
        .select('*')
        .eq('assignment_type', 'role')
        .eq('is_enabled', true);

      if (error) throw error;

      // Group by role
      const byRole: Record<string, NotificationAssignment[]> = {};
      (assignments || []).forEach((assignment) => {
        if (assignment.role) {
          if (!byRole[assignment.role]) {
            byRole[assignment.role] = [];
          }
          byRole[assignment.role].push({
            ...assignment,
            assignment_type: assignment.assignment_type as 'role' | 'user' | 'all',
            channel: assignment.channel as 'email' | 'push' | 'both',
          });
        }
      });

      return byRole;
    },
  });
}

export function useCreateAssignment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      assignment: Omit<NotificationAssignment, 'id' | 'created_at' | 'updated_at' | 'assigned_by'>
    ) => {
      const { data, error } = await supabase
        .from('email_notification_assignments')
        .insert({
          ...assignment,
          assigned_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Log the action
      await supabase.from('email_notification_audit_log').insert({
        action: 'assigned',
        notification_type_id: assignment.notification_type_id,
        target_user_id: assignment.user_id,
        target_role: assignment.role,
        performed_by: user?.id,
        details: {
          assignment_type: assignment.assignment_type,
          channel: assignment.channel,
        },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-notification-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['email-notification-types-with-assignments'] });
      toast.success('Assignment created');
    },
    onError: (error) => {
      toast.error('Failed to create assignment');
      console.error('Create error:', error);
    },
  });
}

export function useUpdateAssignment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<NotificationAssignment>;
    }) => {
      const { data, error } = await supabase
        .from('email_notification_assignments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log the action
      const action = updates.is_enabled === false ? 'disabled' : 'enabled';
      await supabase.from('email_notification_audit_log').insert({
        action,
        notification_type_id: data.notification_type_id,
        target_user_id: data.user_id,
        target_role: data.role,
        performed_by: user?.id,
        details: updates,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-notification-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['email-notification-types-with-assignments'] });
      toast.success('Assignment updated');
    },
    onError: (error) => {
      toast.error('Failed to update assignment');
      console.error('Update error:', error);
    },
  });
}

export function useDeleteAssignment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (assignment: NotificationAssignment) => {
      const { error } = await supabase
        .from('email_notification_assignments')
        .delete()
        .eq('id', assignment.id);

      if (error) throw error;

      // Log the action
      await supabase.from('email_notification_audit_log').insert({
        action: 'unassigned',
        notification_type_id: assignment.notification_type_id,
        target_user_id: assignment.user_id,
        target_role: assignment.role,
        performed_by: user?.id,
        details: {
          assignment_type: assignment.assignment_type,
        },
      });

      return assignment.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-notification-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['email-notification-types-with-assignments'] });
      toast.success('Assignment removed');
    },
    onError: (error) => {
      toast.error('Failed to remove assignment');
      console.error('Delete error:', error);
    },
  });
}

export function useBulkAssignRole() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      role,
      notificationTypeIds,
      channel = 'email',
    }: {
      role: string;
      notificationTypeIds: string[];
      channel?: 'email' | 'push' | 'both';
    }) => {
      // First, remove existing role assignments for these types
      await supabase
        .from('email_notification_assignments')
        .delete()
        .eq('role', role)
        .in('notification_type_id', notificationTypeIds);

      // Create new assignments
      const assignments = notificationTypeIds.map((typeId) => ({
        notification_type_id: typeId,
        assignment_type: 'role' as const,
        role,
        is_enabled: true,
        channel,
        assigned_by: user?.id,
      }));

      const { data, error } = await supabase
        .from('email_notification_assignments')
        .insert(assignments)
        .select();

      if (error) throw error;

      // Log bulk action
      await supabase.from('email_notification_audit_log').insert({
        action: 'assigned',
        target_role: role,
        performed_by: user?.id,
        details: {
          bulk_operation: true,
          notification_type_count: notificationTypeIds.length,
          notification_type_ids: notificationTypeIds,
        },
      });

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['email-notification-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['email-notification-types-with-assignments'] });
      toast.success(`Assigned ${variables.notificationTypeIds.length} notifications to ${variables.role}`);
    },
    onError: (error) => {
      toast.error('Failed to bulk assign');
      console.error('Bulk assign error:', error);
    },
  });
}
