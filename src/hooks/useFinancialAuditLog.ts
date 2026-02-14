import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type FinancialAction =
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.deleted'
  | 'expense.created'
  | 'expense.updated'
  | 'expense.deleted'
  | 'budget.created'
  | 'budget.updated'
  | 'invoice.generated'
  | 'payout.approved'
  | 'commission.updated';

interface AuditPayload {
  action: FinancialAction;
  entityId?: string;
  entityType: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  reason?: string;
}

/**
 * Hook that logs financial mutations to audit_logs for compliance.
 */
export function useFinancialAuditLog() {
  const { user } = useAuth();

  const logAction = useCallback(
    async ({ action, entityId, entityType, oldValue, newValue, reason }: AuditPayload) => {
      if (!user) return;

      try {
        await (supabase as any).from('audit_logs').insert({
          user_id: user.id,
          action,
          entity_type: entityType,
          entity_id: entityId || null,
          old_value: oldValue ? JSON.stringify(oldValue) : null,
          new_value: newValue ? JSON.stringify(newValue) : null,
          metadata: { reason, source: 'finance_hub' },
        });
      } catch (err) {
        console.error('Audit log write failed:', err);
      }
    },
    [user],
  );

  return { logAction };
}
