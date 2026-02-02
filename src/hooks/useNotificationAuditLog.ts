import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface NotificationAuditEntry {
  id: string;
  action: string;
  notification_type_id: string | null;
  notification_type_key: string | null;
  target_user_id: string | null;
  target_role: string | null;
  performed_by: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditEntryWithDetails extends NotificationAuditEntry {
  notification_type?: {
    key: string;
    name: string;
  } | null;
  performer?: {
    full_name: string;
    email: string;
  } | null;
  target_user?: {
    full_name: string;
    email: string;
  } | null;
}

interface UseNotificationAuditLogOptions {
  limit?: number;
  action?: string;
  notificationTypeId?: string;
}

export function useNotificationAuditLog(options: UseNotificationAuditLogOptions = {}) {
  const { limit = 100, action, notificationTypeId } = options;

  return useQuery({
    queryKey: ['email-notification-audit-log', { limit, action, notificationTypeId }],
    queryFn: async () => {
      let query = supabase
        .from('email_notification_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (action) {
        query = query.eq('action', action);
      }

      if (notificationTypeId) {
        query = query.eq('notification_type_id', notificationTypeId);
      }

      const { data: auditEntries, error } = await query;

      if (error) throw error;

      // Fetch notification types for entries
      const typeIds = [...new Set((auditEntries || [])
        .filter(e => e.notification_type_id)
        .map(e => e.notification_type_id as string))];

      let notificationTypes: Record<string, { key: string; name: string }> = {};
      if (typeIds.length > 0) {
        const { data: types } = await supabase
          .from('email_notification_types')
          .select('id, key, name')
          .in('id', typeIds);
        
        if (types) {
          notificationTypes = Object.fromEntries(
            types.map(t => [t.id, { key: t.key, name: t.name }])
          );
        }
      }

      // Fetch user info for performers and targets
      const userIds = [...new Set([
        ...(auditEntries || []).filter(e => e.performed_by).map(e => e.performed_by as string),
        ...(auditEntries || []).filter(e => e.target_user_id).map(e => e.target_user_id as string),
      ])];

      let users: Record<string, { full_name: string; email: string }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        
        if (profiles) {
          users = Object.fromEntries(
            profiles.map(p => [p.id, { full_name: p.full_name || 'Unknown', email: p.email || '' }])
          );
        }
      }

      // Combine data
      const enrichedEntries = (auditEntries || []).map(entry => ({
        ...entry,
        details: (entry.details as Record<string, unknown>) || null,
        ip_address: entry.ip_address ? String(entry.ip_address) : null,
        notification_type: entry.notification_type_id 
          ? notificationTypes[entry.notification_type_id] 
          : null,
        performer: entry.performed_by ? users[entry.performed_by] : null,
        target_user: entry.target_user_id ? users[entry.target_user_id] : null,
      })) as AuditEntryWithDetails[];

      return enrichedEntries;
    },
  });
}

export const AUDIT_ACTIONS = [
  { key: 'assigned', label: 'Assigned', color: 'text-green-500' },
  { key: 'unassigned', label: 'Unassigned', color: 'text-red-500' },
  { key: 'enabled', label: 'Enabled', color: 'text-blue-500' },
  { key: 'disabled', label: 'Disabled', color: 'text-amber-500' },
  { key: 'sent', label: 'Sent', color: 'text-purple-500' },
  { key: 'failed', label: 'Failed', color: 'text-destructive' },
  { key: 'created', label: 'Created', color: 'text-emerald-500' },
  { key: 'updated', label: 'Updated', color: 'text-cyan-500' },
  { key: 'deleted', label: 'Deleted', color: 'text-rose-500' },
] as const;
