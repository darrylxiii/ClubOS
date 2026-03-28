import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TimelineView, type TimelineItem } from '@/components/partner/shared/TimelineView';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowUpRight,
  XCircle,
  Gift,
  CheckCircle2,
  ClipboardList,
} from 'lucide-react';

interface DecisionAuditTrailProps {
  companyId: string | null;
}

// ── Map decision category → icon / color ────────────────────────
const DECISION_CONFIG: Record<string, {
  icon: typeof ArrowUpRight;
  iconColor: string;
  badgeVariant: 'default' | 'secondary' | 'outline' | 'destructive';
}> = {
  advanced: {
    icon: ArrowUpRight,
    iconColor: 'text-blue-500',
    badgeVariant: 'secondary',
  },
  rejected: {
    icon: XCircle,
    iconColor: 'text-rose-500',
    badgeVariant: 'destructive',
  },
  offered: {
    icon: Gift,
    iconColor: 'text-amber-500',
    badgeVariant: 'outline',
  },
  hired: {
    icon: CheckCircle2,
    iconColor: 'text-emerald-500',
    badgeVariant: 'default',
  },
};

// ── Component ───────────────────────────────────────────────────
export function DecisionAuditTrail({ companyId }: DecisionAuditTrailProps) {
  const { t } = useTranslation('partner');

  const { data: rawDecisions = [], isLoading } = useQuery({
    queryKey: ['decision-audit-trail', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      try {
        // Fetch scorecards with recommendation decisions
        const { data: scorecards, error } = await (supabase as any)
          .from('candidate_scorecards')
          .select('id, evaluator_id, application_id, recommendation, overall_rating, created_at')
          .order('created_at', { ascending: false })
          .limit(200);

        if (error || !scorecards || scorecards.length === 0) return [];

        // Gather unique IDs for enrichment
        const evaluatorIds = [...new Set(scorecards.map((s: any) => s.evaluator_id))] as string[];
        const applicationIds = [...new Set(scorecards.map((s: any) => s.application_id))] as string[];

        // Parallel enrichment queries
        const [profilesRes, appsRes] = await Promise.all([
          evaluatorIds.length > 0
            ? supabase.from('profiles').select('id, full_name').in('id', evaluatorIds)
            : Promise.resolve({ data: [] }),
          applicationIds.length > 0
            ? supabase.from('applications').select('id, candidate_id, job_id').in('id', applicationIds)
            : Promise.resolve({ data: [] }),
        ]);

        const profileMap: Record<string, string> = {};
        (profilesRes.data || []).forEach((p: any) => { profileMap[p.id] = p.full_name; });

        const appMap: Record<string, any> = {};
        (appsRes.data || []).forEach((a: any) => { appMap[a.id] = a; });

        // Fetch job + candidate details
        const jobIds = [...new Set((appsRes.data || []).map((a: any) => a.job_id).filter(Boolean))] as string[];
        const candidateIds = [...new Set((appsRes.data || []).map((a: any) => a.candidate_id).filter(Boolean))] as string[];

        const [jobsRes, candsRes] = await Promise.all([
          jobIds.length > 0
            ? supabase.from('jobs').select('id, title').in('id', jobIds)
            : Promise.resolve({ data: [] }),
          candidateIds.length > 0
            ? supabase.from('candidates').select('id, name').in('id', candidateIds)
            : Promise.resolve({ data: [] }),
        ]);

        const jobMap: Record<string, string> = {};
        (jobsRes.data || []).forEach((j: any) => { jobMap[j.id] = j.title; });
        const candMap: Record<string, string> = {};
        (candsRes.data || []).forEach((c: any) => { candMap[c.id] = c.name; });

        return scorecards.map((sc: any) => {
          const app = appMap[sc.application_id];
          return {
            id: sc.id,
            evaluator_name: profileMap[sc.evaluator_id] || 'Unknown',
            candidate_name: app ? candMap[app.candidate_id] || 'Unknown' : 'Unknown',
            job_title: app ? jobMap[app.job_id] || 'Unknown' : 'Unknown',
            recommendation: sc.recommendation || 'neutral',
            overall_rating: sc.overall_rating ?? 0,
            created_at: sc.created_at,
          };
        });
      } catch (err) {
        console.warn('[DecisionAuditTrail] fetch failed:', err);
        return [];
      }
    },
    enabled: !!companyId,
    staleTime: 30_000,
  });

  // Map recommendation → decision category
  const mapToCategory = (rec: string): string => {
    if (rec === 'strong_yes' || rec === 'yes') return 'advanced';
    if (rec === 'strong_no' || rec === 'no') return 'rejected';
    return 'advanced'; // neutral treated as "advanced for further review"
  };

  // Transform to TimelineItem[]
  const timelineItems: TimelineItem[] = useMemo(() => {
    return rawDecisions.map((d: any) => {
      const category = mapToCategory(d.recommendation);
      const config = DECISION_CONFIG[category] || DECISION_CONFIG.advanced;
      const recLabel = d.recommendation?.replace('_', ' ') || 'unknown';

      return {
        id: d.id,
        timestamp: d.created_at,
        title: d.candidate_name,
        description: t('committee.audit.decisionBy', '{{reviewer}} recommended "{{recommendation}}" for {{job}}', {
          reviewer: d.evaluator_name,
          recommendation: recLabel,
          job: d.job_title,
        }),
        category,
        icon: config.icon,
        iconColor: config.iconColor,
        badge: recLabel,
        badgeVariant: config.badgeVariant,
        metadata: {
          [t('committee.audit.job', 'Job')]: d.job_title,
          [t('committee.audit.reviewer', 'Reviewer')]: d.evaluator_name,
          [t('committee.audit.score', 'Score')]: `${d.overall_rating}/5`,
        },
      } satisfies TimelineItem;
    });
  }, [rawDecisions, t]);

  const filterCategories = useMemo(() => [
    { value: 'advanced', label: t('committee.audit.filterAdvanced', 'Advanced') },
    { value: 'rejected', label: t('committee.audit.filterRejected', 'Rejected') },
    { value: 'offered', label: t('committee.audit.filterOffered', 'Offered') },
    { value: 'hired', label: t('committee.audit.filterHired', 'Hired') },
  ], [t]);

  if (isLoading) {
    return (
      <div className="space-y-4" role="status" aria-label={t('committee.audit.loading', 'Loading audit trail')}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {timelineItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center" role="status">
          <ClipboardList className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            {t('committee.audit.emptyTitle', 'No decisions recorded')}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs">
            {t('committee.audit.emptyDesc', 'Hiring decisions will appear here as reviewers submit their scorecards.')}
          </p>
        </div>
      ) : (
        <TimelineView
          items={timelineItems}
          filterCategories={filterCategories}
          maxVisible={15}
          showTimestamps
          emptyMessage={t('committee.audit.emptyFiltered', 'No decisions match this filter')}
        />
      )}
    </div>
  );
}
