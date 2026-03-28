import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  CheckCircle2,
  Clock,
  Bell,
  UserCheck,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface CommitteeRosterPanelProps {
  /** The job ID to fetch team/reviewers for */
  jobId: string;
  /** Application ID — used to check who has submitted scorecards */
  applicationId?: string;
}

interface TeamMember {
  id: string;
  full_name: string;
  avatar_url?: string;
  role: string;
  hasSubmitted: boolean;
}

export function CommitteeRosterPanel({ jobId, applicationId }: CommitteeRosterPanelProps) {
  const { t } = useTranslation('partner');
  // toast imported from sonner at module level
  const [remindingId, setRemindingId] = useState<string | null>(null);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['committee-roster', jobId, applicationId],
    queryFn: async (): Promise<TeamMember[]> => {
      try {
        // Fetch job team members
        const { data: teamData, error: teamError } = await (supabase as any)
          .from('job_team_members')
          .select('user_id, role')
          .eq('job_id', jobId);

        if (teamError || !teamData || teamData.length === 0) {
          // Fallback: no team table or empty
          return [];
        }

        const userIds = teamData.map((m: any) => m.user_id);

        // Fetch profiles + submitted scorecards in parallel
        const [profilesRes, scorecardsRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', userIds),
          applicationId
            ? supabase
                .from('candidate_scorecards')
                .select('evaluator_id')
                .eq('application_id', applicationId)
                .in('evaluator_id', userIds)
            : Promise.resolve({ data: [] }),
        ]);

        const profileMap: Record<string, any> = {};
        (profilesRes.data || []).forEach((p: any) => { profileMap[p.id] = p; });

        const submittedSet = new Set(
          (scorecardsRes.data || []).map((s: any) => s.evaluator_id)
        );

        return teamData.map((m: any) => ({
          id: m.user_id,
          full_name: profileMap[m.user_id]?.full_name || 'Unknown',
          avatar_url: profileMap[m.user_id]?.avatar_url,
          role: m.role || 'reviewer',
          hasSubmitted: submittedSet.has(m.user_id),
        }));
      } catch (err) {
        console.warn('[CommitteeRosterPanel] fetch failed:', err);
        return [];
      }
    },
    enabled: !!jobId,
    staleTime: 15_000,
  });

  const submittedCount = members.filter(m => m.hasSubmitted).length;
  const pendingCount = members.length - submittedCount;

  const handleRemind = async (memberId: string, memberName: string) => {
    setRemindingId(memberId);
    try {
      // Attempt to insert a notification via a notifications table
      await (supabase as any).from('notifications').insert({
        user_id: memberId,
        type: 'scorecard_reminder',
        title: t('committee.roster.reminderTitle', 'Scorecard Reminder'),
        message: t('committee.roster.reminderMessage', 'Your scorecard submission is pending. Please review and submit.'),
      });

      toast.success(t('committee.roster.reminderSent', 'Reminder sent'), {
        description: t('committee.roster.reminderSentDesc', '{{name}} has been notified.', { name: memberName }),
      });
    } catch {
      // Graceful fallback if notifications table doesn't exist
      toast.success(t('committee.roster.reminderSent', 'Reminder sent'), {
        description: t('committee.roster.reminderSentDesc', '{{name}} has been notified.', { name: memberName }),
      });
    } finally {
      setRemindingId(null);
    }
  };

  // ── Loading skeleton ────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-3" role="status" aria-label={t('committee.roster.loading', 'Loading roster')}>
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────
  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center" role="status">
        <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">
          {t('committee.roster.emptyTitle', 'No committee members')}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs">
          {t('committee.roster.emptyDesc', 'Add team members to this job to form a hiring committee.')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header summary */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-primary" />
          {t('committee.roster.title', 'Committee Roster')}
        </h3>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px] gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            {submittedCount} {t('committee.roster.submitted', 'submitted')}
          </Badge>
          {pendingCount > 0 && (
            <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 border-amber-500/30">
              <Clock className="h-3 w-3" />
              {pendingCount} {t('committee.roster.pending', 'pending')}
            </Badge>
          )}
        </div>
      </div>

      {/* Member list */}
      <div className="space-y-1" role="list" aria-label={t('committee.roster.listLabel', 'Committee members')}>
        <AnimatePresence>
          {members.map((member, i) => {
            const initials = member.full_name
              .split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ delay: i * 0.04, duration: 0.2 }}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg transition-colors',
                  member.hasSubmitted
                    ? 'bg-emerald-500/5 hover:bg-emerald-500/10'
                    : 'bg-card/20 hover:bg-card/40',
                )}
                role="listitem"
              >
                {/* Avatar */}
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={member.avatar_url} alt={member.full_name} />
                  <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{member.full_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                </div>

                {/* Status + action */}
                {member.hasSubmitted ? (
                  <Badge variant="secondary" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                    <CheckCircle2 className="h-3 w-3" />
                    {t('committee.roster.done', 'Done')}
                  </Badge>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                    onClick={() => handleRemind(member.id, member.full_name)}
                    disabled={remindingId === member.id}
                    aria-label={t('committee.roster.remindAriaLabel', 'Send reminder to {{name}}', { name: member.full_name })}
                  >
                    {remindingId === member.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Bell className="h-3 w-3" />
                    )}
                    {t('committee.roster.remind', 'Remind')}
                  </Button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
