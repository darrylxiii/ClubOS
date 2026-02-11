import { supabase } from "@/integrations/supabase/client";

export type StealthAuditActionType = 
  | 'viewer_added' 
  | 'viewer_removed' 
  | 'stealth_enabled' 
  | 'stealth_disabled' 
  | 'bulk_add' 
  | 'bulk_remove';

interface AuditUser {
  id: string;
  email?: string;
  full_name?: string;
}

interface AuditLogEntry {
  job_id: string;
  job_title: string;
  action_type: StealthAuditActionType;
  target_user_id?: string;
  target_user_email?: string;
  target_user_name?: string;
  performed_by: string;
  performed_by_email?: string;
  performed_by_name?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Service for logging stealth job viewer audit events.
 * All operations are fire-and-forget to avoid blocking main workflows.
 */
export const stealthJobAuditService = {
  /**
   * Log when stealth mode is toggled on a job
   */
  async logStealthToggled(
    jobId: string,
    jobTitle: string,
    enabled: boolean,
    performer: AuditUser
  ): Promise<void> {
    try {
      await supabase.from('stealth_viewer_audit_logs').insert({
        job_id: jobId,
        job_title: jobTitle,
        action_type: enabled ? 'stealth_enabled' : 'stealth_disabled',
        performed_by: performer.id,
        performed_by_email: performer.email,
        performed_by_name: performer.full_name,
        metadata: { enabled },
      });
    } catch (error) {
      console.error('[StealthAudit] Failed to log stealth toggle:', error);
    }
  },

  /**
   * Log when a single viewer is added
   */
  async logViewerAdded(
    jobId: string,
    jobTitle: string,
    targetUser: AuditUser,
    performer: AuditUser
  ): Promise<void> {
    try {
      await supabase.from('stealth_viewer_audit_logs').insert({
        job_id: jobId,
        job_title: jobTitle,
        action_type: 'viewer_added',
        target_user_id: targetUser.id,
        target_user_email: targetUser.email,
        target_user_name: targetUser.full_name,
        performed_by: performer.id,
        performed_by_email: performer.email,
        performed_by_name: performer.full_name,
      });
    } catch (error) {
      console.error('[StealthAudit] Failed to log viewer added:', error);
    }
  },

  /**
   * Log when a single viewer is removed
   */
  async logViewerRemoved(
    jobId: string,
    jobTitle: string,
    targetUser: AuditUser,
    performer: AuditUser
  ): Promise<void> {
    try {
      await supabase.from('stealth_viewer_audit_logs').insert({
        job_id: jobId,
        job_title: jobTitle,
        action_type: 'viewer_removed',
        target_user_id: targetUser.id,
        target_user_email: targetUser.email,
        target_user_name: targetUser.full_name,
        performed_by: performer.id,
        performed_by_email: performer.email,
        performed_by_name: performer.full_name,
      });
    } catch (error) {
      console.error('[StealthAudit] Failed to log viewer removed:', error);
    }
  },

  /**
   * Log when multiple viewers are added at once
   */
  async logBulkViewersAdded(
    jobId: string,
    jobTitle: string,
    targetUserIds: string[],
    performer: AuditUser
  ): Promise<void> {
    if (targetUserIds.length === 0) return;

    try {
      // Fetch user details for the targets
      const { data: users } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', targetUserIds);

      const userMap = new Map(users?.map(u => [u.id, u]) || []);

      await supabase.from('stealth_viewer_audit_logs').insert({
        job_id: jobId,
        job_title: jobTitle,
        action_type: 'bulk_add',
        performed_by: performer.id,
        performed_by_email: performer.email,
        performed_by_name: performer.full_name,
        metadata: {
          count: targetUserIds.length,
          user_ids: targetUserIds,
          users: targetUserIds.map(id => ({
            id,
            email: userMap.get(id)?.email,
            name: userMap.get(id)?.full_name,
          })),
        },
      });
    } catch (error) {
      console.error('[StealthAudit] Failed to log bulk viewers added:', error);
    }
  },

  /**
   * Log when multiple viewers are removed at once
   */
  async logBulkViewersRemoved(
    jobId: string,
    jobTitle: string,
    targetUserIds: string[],
    performer: AuditUser
  ): Promise<void> {
    if (targetUserIds.length === 0) return;

    try {
      // Fetch user details for the targets
      const { data: users } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', targetUserIds);

      const userMap = new Map(users?.map(u => [u.id, u]) || []);

      await supabase.from('stealth_viewer_audit_logs').insert({
        job_id: jobId,
        job_title: jobTitle,
        action_type: 'bulk_remove',
        performed_by: performer.id,
        performed_by_email: performer.email,
        performed_by_name: performer.full_name,
        metadata: {
          count: targetUserIds.length,
          user_ids: targetUserIds,
          users: targetUserIds.map(id => ({
            id,
            email: userMap.get(id)?.email,
            name: userMap.get(id)?.full_name,
          })),
        },
      });
    } catch (error) {
      console.error('[StealthAudit] Failed to log bulk viewers removed:', error);
    }
  },

  /**
   * Get audit history for a specific job
   */
  async getJobAuditHistory(jobId: string) {
    try {
      const { data, error } = await supabase
        .from('stealth_viewer_audit_logs')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[StealthAudit] Failed to fetch audit history:', error);
      return [];
    }
  },

  /**
   * Log viewer changes by comparing old and new viewer lists
   */
  async logViewerChanges(
    jobId: string,
    jobTitle: string,
    previousViewerIds: string[],
    newViewerIds: string[],
    performer: AuditUser
  ): Promise<void> {
    const addedViewerIds = newViewerIds.filter(id => !previousViewerIds.includes(id));
    const removedViewerIds = previousViewerIds.filter(id => !newViewerIds.includes(id));

    // Log additions
    if (addedViewerIds.length > 0) {
      await this.logBulkViewersAdded(jobId, jobTitle, addedViewerIds, performer);
    }

    // Log removals
    if (removedViewerIds.length > 0) {
      await this.logBulkViewersRemoved(jobId, jobTitle, removedViewerIds, performer);
    }
  },
};
