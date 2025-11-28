import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function useAdminTracking() {
  const { user } = useAuth();

  const trackAdminAction = useCallback(async (
    actionType: string,
    actionCategory: string,
    targetEntity: string,
    targetId: string | null,
    oldValue: any,
    newValue: any,
    reason?: string,
    impactScore: number = 5
  ) => {
    if (!user) return;
    
    try {
      await supabase.from('admin_audit_activity').insert({
        admin_id: user.id,
        action_type: actionType,
        action_category: actionCategory,
        target_entity: targetEntity,
        target_id: targetId,
        old_value: oldValue,
        new_value: newValue,
        reason,
        impact_score: impactScore,
      });
    } catch (error) {
      console.error('Admin tracking error:', error);
    }
  }, [user]);

  const trackMemberApproval = useCallback((memberId: string, approved: boolean, reason?: string) => {
    return trackAdminAction(
      approved ? 'approve' : 'reject',
      'user_management',
      'member_request',
      memberId,
      { status: 'pending' },
      { status: approved ? 'approved' : 'rejected' },
      reason,
      8 // High impact
    );
  }, [trackAdminAction]);

  const trackJobApproval = useCallback((jobId: string, approved: boolean) => {
    return trackAdminAction(
      approved ? 'approve' : 'reject',
      'content_moderation',
      'job_posting',
      jobId,
      { status: 'draft' },
      { status: approved ? 'published' : 'rejected' },
      undefined,
      7
    );
  }, [trackAdminAction]);

  const trackSystemConfiguration = useCallback((configKey: string, oldValue: any, newValue: any) => {
    return trackAdminAction(
      'configure',
      'system_config',
      'system_settings',
      null,
      { [configKey]: oldValue },
      { [configKey]: newValue },
      undefined,
      9 // Critical impact
    );
  }, [trackAdminAction]);

  const trackUserDeletion = useCallback((userId: string, userEmail: string, reason: string) => {
    return trackAdminAction(
      'delete',
      'user_management',
      'user_account',
      userId,
      { email: userEmail, status: 'active' },
      { deleted: true },
      reason,
      10 // Critical impact
    );
  }, [trackAdminAction]);

  const trackDataExport = useCallback((exportType: string, recordCount: number) => {
    return trackAdminAction(
      'export',
      'data_access',
      exportType,
      null,
      null,
      { recordCount },
      undefined,
      3 // Low-medium impact
    );
  }, [trackAdminAction]);

  const trackBulkOperation = useCallback((operationType: string, entityType: string, count: number) => {
    return trackAdminAction(
      operationType,
      'bulk_operation',
      entityType,
      null,
      null,
      { affectedCount: count },
      undefined,
      7 // High impact for bulk ops
    );
  }, [trackAdminAction]);

  return {
    trackAdminAction,
    trackMemberApproval,
    trackJobApproval,
    trackSystemConfiguration,
    trackUserDeletion,
    trackDataExport,
    trackBulkOperation,
  };
}
