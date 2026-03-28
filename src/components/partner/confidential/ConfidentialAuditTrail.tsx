import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TimelineView } from '@/components/partner/shared';
import type { TimelineItem } from '@/components/partner/shared';
import { Eye, ShieldAlert, Lock, Unlock, UserCheck, ArrowUpDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ConfidentialAuditTrailProps {
  jobId: string;
  className?: string;
}

interface AuditLogEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  performed_by: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface StealthAuditEntry {
  id: string;
  job_id: string;
  action_type: string;
  performed_by: string;
  performed_by_email: string | null;
  performed_by_name: string | null;
  target_user_email: string | null;
  target_user_name: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

function getIconForAction(action: string) {
  switch (action) {
    case 'disclosure_level_changed':
      return { icon: ArrowUpDown, color: 'text-blue-500' };
    case 'stealth_enabled':
      return { icon: Lock, color: 'text-amber-500' };
    case 'stealth_disabled':
      return { icon: Unlock, color: 'text-emerald-500' };
    case 'viewer_added':
    case 'bulk_add':
      return { icon: UserCheck, color: 'text-green-500' };
    case 'viewer_removed':
    case 'bulk_remove':
      return { icon: ShieldAlert, color: 'text-red-500' };
    default:
      return { icon: Eye, color: 'text-muted-foreground' };
  }
}

function getCategoryForAction(action: string): string {
  if (action.includes('disclosure')) return 'disclosure';
  if (action.includes('viewer') || action.includes('bulk')) return 'access';
  if (action.includes('stealth')) return 'stealth';
  return 'other';
}

export function ConfidentialAuditTrail({ jobId, className }: ConfidentialAuditTrailProps) {
  const { t } = useTranslation('partner');

  // Fetch from both audit sources in parallel
  const { data: comprehensiveLogs, isLoading: loadingComprehensive } = useQuery({
    queryKey: ['confidential-audit-comprehensive', jobId],
    queryFn: async (): Promise<AuditLogEntry[]> => {
      try {
        const { data, error } = await (supabase as any)
          .from('comprehensive_audit_logs')
          .select('id, action, entity_type, entity_id, performed_by, metadata, created_at')
          .eq('entity_id', jobId)
          .eq('entity_type', 'job')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        return (data || []) as AuditLogEntry[];
      } catch (error) {
        console.error('[ConfidentialAudit] Failed to fetch comprehensive logs:', error);
        return [];
      }
    },
    enabled: !!jobId,
  });

  const { data: stealthLogs, isLoading: loadingStealth } = useQuery({
    queryKey: ['confidential-audit-stealth', jobId],
    queryFn: async (): Promise<StealthAuditEntry[]> => {
      try {
        const { data, error } = await (supabase as any)
          .from('stealth_viewer_audit_logs')
          .select('*')
          .eq('job_id', jobId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        return (data || []) as StealthAuditEntry[];
      } catch (error) {
        console.error('[ConfidentialAudit] Failed to fetch stealth logs:', error);
        return [];
      }
    },
    enabled: !!jobId,
  });

  const isLoading = loadingComprehensive || loadingStealth;

  const timelineItems: TimelineItem[] = useMemo(() => {
    const items: TimelineItem[] = [];

    // Map comprehensive audit logs
    (comprehensiveLogs || []).forEach((log) => {
      const { icon, color } = getIconForAction(log.action);
      const meta = log.metadata || {};

      let title = log.action.replace(/_/g, ' ');
      let description = '';

      if (log.action === 'disclosure_level_changed') {
        title = t('confidential.audit.disclosureChanged', 'Disclosure level changed');
        description = t('confidential.audit.disclosureChangedDesc', '{{from}} to {{to}}', {
          from: String(meta.previous_level || '?'),
          to: String(meta.new_level || '?'),
        });
      }

      items.push({
        id: `comp-${log.id}`,
        timestamp: log.created_at,
        title,
        description,
        category: getCategoryForAction(log.action),
        icon,
        iconColor: color,
        metadata: {
          [t('confidential.audit.by', 'By')]: String(meta.performed_by_name || log.performed_by || t('confidential.audit.system', 'System')),
        },
      });
    });

    // Map stealth viewer audit logs
    (stealthLogs || []).forEach((log) => {
      const { icon, color } = getIconForAction(log.action_type);

      let title = '';
      let description = '';
      let badge: string | undefined;

      switch (log.action_type) {
        case 'stealth_enabled':
          title = t('confidential.audit.stealthEnabled', 'Confidential mode enabled');
          break;
        case 'stealth_disabled':
          title = t('confidential.audit.stealthDisabled', 'Confidential mode disabled');
          break;
        case 'viewer_added':
          title = t('confidential.audit.viewerAdded', 'Viewer granted access');
          description = log.target_user_name || log.target_user_email || '';
          badge = t('confidential.audit.accessGranted', 'Access Granted');
          break;
        case 'viewer_removed':
          title = t('confidential.audit.viewerRemoved', 'Viewer access revoked');
          description = log.target_user_name || log.target_user_email || '';
          badge = t('confidential.audit.accessRevoked', 'Revoked');
          break;
        case 'bulk_add':
          title = t('confidential.audit.bulkAdd', 'Bulk access granted');
          description = t('confidential.audit.bulkCount', '{{count}} viewers added', {
            count: (log.metadata as any)?.count || '?',
          });
          break;
        case 'bulk_remove':
          title = t('confidential.audit.bulkRemove', 'Bulk access revoked');
          description = t('confidential.audit.bulkRemovedCount', '{{count}} viewers removed', {
            count: (log.metadata as any)?.count || '?',
          });
          break;
        default:
          title = log.action_type.replace(/_/g, ' ');
      }

      items.push({
        id: `stealth-${log.id}`,
        timestamp: log.created_at,
        title,
        description,
        category: getCategoryForAction(log.action_type),
        icon,
        iconColor: color,
        badge,
        badgeVariant: log.action_type.includes('remove') ? 'destructive' : 'outline',
        metadata: {
          [t('confidential.audit.by', 'By')]: log.performed_by_name || log.performed_by_email || log.performed_by,
        },
      });
    });

    // Sort combined items by timestamp desc
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return items;
  }, [comprehensiveLogs, stealthLogs, t]);

  const filterCategories = [
    { value: 'disclosure', label: t('confidential.audit.filterDisclosure', 'Disclosure') },
    { value: 'access', label: t('confidential.audit.filterAccess', 'Access') },
    { value: 'stealth', label: t('confidential.audit.filterStealth', 'Stealth') },
  ];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <TimelineView
      items={timelineItems}
      filterCategories={filterCategories}
      maxVisible={15}
      emptyMessage={t('confidential.audit.empty', 'No audit activity for this search yet.')}
      className={className}
    />
  );
}
