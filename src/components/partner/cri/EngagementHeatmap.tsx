import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion } from '@/lib/motion';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, Users } from 'lucide-react';

interface CandidateEngagement {
  id: string;
  name: string;
  avatarUrl: string | null;
  messages: number;
  meetings: number;
  applications: number;
  profileActivity: number;
  total: number;
}

interface EngagementHeatmapProps {
  companyId: string;
  onSelectCandidate?: (candidateId: string) => void;
  className?: string;
}

const DIMENSIONS = ['messages', 'meetings', 'applications', 'profileActivity'] as const;
const DIMENSION_LABELS: Record<string, string> = {
  messages: 'Msgs',
  meetings: 'Mtgs',
  applications: 'Apps',
  profileActivity: 'Profile',
};

function cellColor(value: number, max: number): string {
  if (max === 0 || value === 0) return 'bg-muted/20';
  const ratio = value / max;
  if (ratio < 0.25) return 'bg-rose-500/20 text-rose-600';
  if (ratio < 0.5) return 'bg-amber-500/20 text-amber-600';
  if (ratio < 0.75) return 'bg-emerald-500/20 text-emerald-600';
  return 'bg-emerald-500/40 text-emerald-700';
}

export function EngagementHeatmap({
  companyId,
  onSelectCandidate,
  className,
}: EngagementHeatmapProps) {
  const { t } = useTranslation('partner');
  const [sortBy, setSortBy] = useState<'total' | typeof DIMENSIONS[number]>('total');
  const [sortAsc, setSortAsc] = useState(false);

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ['engagement-heatmap', companyId],
    enabled: !!companyId,
    staleTime: 120_000,
    queryFn: async (): Promise<CandidateEngagement[]> => {
      try {
        // Get active pipeline candidates
        const { data: apps } = await (supabase as any)
          .from('applications')
          .select('candidate_id, status, jobs!inner(company_id)')
          .eq('jobs.company_id', companyId)
          .in('status', ['applied', 'screening', 'interview', 'offer', 'active', 'in_review'])
          .limit(100);

        if (!apps || apps.length === 0) return [];

        const candidateIds = [
          ...new Set((apps as any[]).map((a) => a.candidate_id)),
        ].slice(0, 30) as string[];

        // Fetch profiles
        const { data: profiles } = await (supabase as any)
          .from('profiles')
          .select('id, full_name, avatar_url, updated_at')
          .in('id', candidateIds);

        if (!profiles || profiles.length === 0) return [];

        const results: CandidateEngagement[] = [];
        const sevenDaysAgo = new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString();

        for (const profile of profiles) {
          // Count messages
          const { count: msgCount } = await (supabase as any)
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .or(`sender_id.eq.${profile.id},recipient_id.eq.${profile.id}`);

          // Count meetings
          const { count: mtgCount } = await (supabase as any)
            .from('meetings')
            .select('id', { count: 'exact', head: true })
            .or(`candidate_id.eq.${profile.id},organizer_id.eq.${profile.id}`);

          // Count applications
          const appCount = (apps as any[]).filter(
            (a: any) => a.candidate_id === profile.id,
          ).length;

          // Profile activity (binary: updated recently?)
          const profileActivity =
            profile.updated_at && profile.updated_at > sevenDaysAgo ? 1 : 0;

          const messages = msgCount || 0;
          const meetings = mtgCount || 0;

          results.push({
            id: profile.id,
            name: profile.full_name || 'Unknown',
            avatarUrl: profile.avatar_url,
            messages,
            meetings,
            applications: appCount,
            profileActivity,
            total: messages + meetings * 3 + appCount * 2 + profileActivity * 5,
          });
        }

        return results;
      } catch (err) {
        console.error('[EngagementHeatmap] Error:', err);
        return [];
      }
    },
  });

  const sorted = useMemo(() => {
    const copy = [...candidates];
    copy.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      return sortAsc ? aVal - bVal : bVal - aVal;
    });
    return copy;
  }, [candidates, sortBy, sortAsc]);

  const maxValues = useMemo(() => {
    const maxes: Record<string, number> = {};
    for (const dim of DIMENSIONS) {
      maxes[dim] = Math.max(1, ...candidates.map((c) => c[dim]));
    }
    return maxes;
  }, [candidates]);

  const handleSort = (col: 'total' | typeof DIMENSIONS[number]) => {
    if (sortBy === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(col);
      setSortAsc(false);
    }
  };

  if (isLoading) {
    return (
      <div className={cn('p-5 rounded-xl bg-card/30 backdrop-blur border border-border/20', className)}>
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">
            {t('cri.heatmap.title', 'Engagement Heatmap')}
          </h3>
        </div>
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-muted/20 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'p-5 rounded-xl bg-card/30 backdrop-blur border border-border/20',
        className,
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">
            {t('cri.heatmap.title', 'Engagement Heatmap')}
          </h3>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {t('cri.heatmap.count', '{{count}} candidates', {
            count: candidates.length,
          })}
        </span>
      </div>

      {candidates.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          {t('cri.heatmap.empty', 'No active pipeline candidates found.')}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/20">
                <th className="text-left py-2 pr-3 font-medium text-muted-foreground w-40">
                  {t('cri.heatmap.candidate', 'Candidate')}
                </th>
                {DIMENSIONS.map((dim) => (
                  <th key={dim} className="text-center py-2 px-1 font-medium text-muted-foreground">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 text-[10px] px-1 gap-0.5"
                      onClick={() => handleSort(dim)}
                    >
                      {DIMENSION_LABELS[dim]}
                      {sortBy === dim && (
                        <ArrowUpDown className="h-2.5 w-2.5" />
                      )}
                    </Button>
                  </th>
                ))}
                <th className="text-center py-2 px-1 font-medium text-muted-foreground">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 text-[10px] px-1 gap-0.5"
                    onClick={() => handleSort('total')}
                  >
                    {t('cri.heatmap.total', 'Total')}
                    {sortBy === 'total' && (
                      <ArrowUpDown className="h-2.5 w-2.5" />
                    )}
                  </Button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c, idx) => (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.02 }}
                  className="border-b border-border/10 cursor-pointer hover:bg-card/40 transition-colors"
                  onClick={() => onSelectCandidate?.(c.id)}
                >
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={c.avatarUrl || undefined} alt={c.name} />
                        <AvatarFallback className="text-[9px]">
                          {c.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate font-medium">{c.name}</span>
                    </div>
                  </td>
                  {DIMENSIONS.map((dim) => (
                    <td key={dim} className="text-center py-2 px-1">
                      <div
                        className={cn(
                          'inline-flex items-center justify-center w-8 h-6 rounded text-[10px] font-medium',
                          cellColor(c[dim], maxValues[dim]),
                        )}
                      >
                        {c[dim]}
                      </div>
                    </td>
                  ))}
                  <td className="text-center py-2 px-1">
                    <span className="font-semibold tabular-nums">{c.total}</span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
        <span>{t('cri.heatmap.legendLow', 'Low')}</span>
        <div className="flex gap-0.5">
          {[
            'bg-rose-500/20',
            'bg-amber-500/20',
            'bg-emerald-500/20',
            'bg-emerald-500/40',
          ].map((c, i) => (
            <div key={i} className={cn('w-4 h-2.5 rounded-sm', c)} />
          ))}
        </div>
        <span>{t('cri.heatmap.legendHigh', 'High')}</span>
      </div>
    </motion.div>
  );
}
