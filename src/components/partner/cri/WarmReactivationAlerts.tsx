import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from '@/lib/motion';
import { supabase } from '@/integrations/supabase/client';
import { GlassMetricCard } from '@/components/partner/shared';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { UserCheck, Flame, Send, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface ReactivationCandidate {
  id: string;
  name: string;
  avatarUrl: string | null;
  lastInteractionDate: string | null;
  signal: 'profile_update' | 'new_application' | 'activity';
  signalLabel: string;
}

interface WarmReactivationAlertsProps {
  companyId: string;
  onSelectCandidate?: (candidateId: string) => void;
  className?: string;
}

export function WarmReactivationAlerts({
  companyId,
  onSelectCandidate,
  className,
}: WarmReactivationAlertsProps) {
  const { t } = useTranslation('partner');

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ['warm-reactivation', companyId],
    enabled: !!companyId,
    staleTime: 120_000,
    queryFn: async (): Promise<ReactivationCandidate[]> => {
      try {
        // Find candidates who:
        // 1. Have applications with this company
        // 2. Last message/meeting > 30 days ago
        // 3. Profile updated within 7 days
        const thirtyDaysAgo = new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString();
        const sevenDaysAgo = new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString();

        // Get candidates with applications at this company
        const { data: apps } = await (supabase as any)
          .from('applications')
          .select('candidate_id, updated_at, jobs!inner(company_id)')
          .eq('jobs.company_id', companyId)
          .order('updated_at', { ascending: false })
          .limit(200);

        if (!apps || apps.length === 0) return [];

        // Unique candidate IDs
        const candidateIds = [
          ...new Set((apps as any[]).map((a) => a.candidate_id)),
        ].slice(0, 50) as string[];

        // Fetch profiles
        const { data: profiles } = await (supabase as any)
          .from('profiles')
          .select('id, full_name, avatar_url, updated_at')
          .in('id', candidateIds);

        if (!profiles || profiles.length === 0) return [];

        // Filter for warm reactivation signals
        const results: ReactivationCandidate[] = [];

        for (const profile of profiles) {
          const profileUpdatedRecently =
            profile.updated_at && profile.updated_at > sevenDaysAgo;

          // Check last interaction
          const { data: lastMsg } = await (supabase as any)
            .from('messages')
            .select('created_at')
            .or(
              `sender_id.eq.${profile.id},recipient_id.eq.${profile.id}`,
            )
            .order('created_at', { ascending: false })
            .limit(1);

          const lastMsgDate = lastMsg?.[0]?.created_at ?? null;
          const isInactive =
            !lastMsgDate || lastMsgDate < thirtyDaysAgo;

          if (isInactive && profileUpdatedRecently) {
            results.push({
              id: profile.id,
              name: profile.full_name || 'Unknown',
              avatarUrl: profile.avatar_url,
              lastInteractionDate: lastMsgDate,
              signal: 'profile_update',
              signalLabel: t(
                'cri.reactivation.profileUpdate',
                'Updated profile',
              ),
            });
          }

          // Also check for new applications
          const recentApp = (apps as any[]).find(
            (a: any) =>
              a.candidate_id === profile.id &&
              a.updated_at > sevenDaysAgo,
          );
          if (isInactive && recentApp && !profileUpdatedRecently) {
            results.push({
              id: profile.id,
              name: profile.full_name || 'Unknown',
              avatarUrl: profile.avatar_url,
              lastInteractionDate: lastMsgDate,
              signal: 'new_application',
              signalLabel: t(
                'cri.reactivation.newApplication',
                'New application',
              ),
            });
          }
        }

        return results.slice(0, 10);
      } catch (err) {
        console.error('[WarmReactivationAlerts] Error:', err);
        return [];
      }
    },
  });

  const handleReachOut = (candidateId: string, name: string) => {
    onSelectCandidate?.(candidateId);
    toast.success(
      t('cri.reactivation.reachOutStarted', 'Opening profile for {{name}}', {
        name,
      }),
    );
  };

  const signalIcons: Record<string, typeof Flame> = {
    profile_update: RefreshCw,
    new_application: Flame,
    activity: UserCheck,
  };

  return (
    <div className={cn('space-y-4', className)}>
      <GlassMetricCard
        icon={Flame}
        label={t('cri.reactivation.title', 'Warm Reactivation')}
        value={candidates.length}
        color="amber"
        subtitle={t(
          'cri.reactivation.subtitle',
          'Silver-medalist candidates showing re-engagement',
        )}
      />

      {isLoading ? (
        <div className="space-y-2 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20">
              <div className="w-8 h-8 rounded-full bg-muted" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="h-2 bg-muted rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : candidates.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          {t(
            'cri.reactivation.none',
            'No warm reactivation candidates at this time.',
          )}
        </p>
      ) : (
        <AnimatePresence>
          <div className="space-y-2">
            {candidates.map((c, i) => {
              const SignalIcon = signalIcons[c.signal] || Flame;
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.2 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-card/20 border border-border/10 hover:border-primary/20 transition-colors"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={c.avatarUrl || undefined} alt={c.name} />
                    <AvatarFallback className="text-xs">
                      {c.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <SignalIcon className="h-3 w-3 text-amber-500" />
                      <span className="text-[10px] text-muted-foreground">
                        {c.signalLabel}
                      </span>
                      {c.lastInteractionDate && (
                        <span className="text-[10px] text-muted-foreground/60">
                          {' '}
                          - Last contact:{' '}
                          {new Date(c.lastInteractionDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-500 shrink-0">
                    {c.signalLabel}
                  </Badge>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 shrink-0"
                    onClick={() => handleReachOut(c.id, c.name)}
                  >
                    <Send className="h-3 w-3" />
                    {t('cri.reactivation.reachOut', 'Reach out')}
                  </Button>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
