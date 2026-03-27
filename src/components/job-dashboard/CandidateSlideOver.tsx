import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExternalLink, Mail, ArrowRight, X, Calendar, MessageSquare, UserCheck, ArrowUpDown, Clock } from 'lucide-react';
import { MatchScoreRing } from './MatchScoreRing';
import { useCandidateActivity, type ActivityItem } from '@/hooks/useCandidateActivity';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface CandidateSlideOverProps {
  open: boolean;
  onClose: () => void;
  candidate: Record<string, unknown> | null;
  jobId: string;
  stages: { order: number; name: string }[];
  onAdvance?: (app: Record<string, unknown>) => void;
  onReject?: (app: Record<string, unknown>) => void;
  onEmail?: (app: Record<string, unknown>) => void;
  onScheduleInterview?: (app: Record<string, unknown>) => void;
}

const EVENT_ICON_MAP: Record<string, typeof ArrowUpDown> = {
  stage_change: ArrowUpDown,
  status_change: UserCheck,
  interview_scheduled: Calendar,
  feedback_added: MessageSquare,
  message_sent: Mail,
  email_sent: Mail,
  call: MessageSquare,
  note: MessageSquare,
  meeting: Calendar,
};

function ActivityTimeline({ items, isLoading }: { items: ActivityItem[]; isLoading: boolean }) {
  const { t } = useTranslation('jobDashboard');
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-6">
        {t('slideOver.noActivity', 'No activity recorded yet')}
      </p>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-3 top-2 bottom-2 w-px bg-border/30" />

      <div className="space-y-1">
        {items.map((item) => {
          const Icon = EVENT_ICON_MAP[item.eventType] || Clock;
          const date = new Date(item.timestamp);
          const isRecent = Date.now() - date.getTime() < 24 * 60 * 60 * 1000;

          return (
            <div key={item.id} className="flex items-start gap-3 pl-0.5 py-1.5">
              <div className={cn(
                'relative z-10 w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                item.type === 'pipeline_event' ? 'bg-primary/10' : 'bg-muted/50',
              )}>
                <Icon className="w-2.5 h-2.5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] leading-tight">{item.description}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {item.performerName && (
                    <span className="text-[10px] text-muted-foreground">{item.performerName}</span>
                  )}
                  <span className={cn(
                    'text-[10px] tabular-nums',
                    isRecent ? 'text-primary' : 'text-muted-foreground/60',
                  )}>
                    {formatRelativeTime(date)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const CandidateSlideOver = memo(({
  open,
  onClose,
  candidate,
  jobId,
  stages,
  onAdvance,
  onReject,
  onEmail,
  onScheduleInterview,
}: CandidateSlideOverProps) => {
  const { t } = useTranslation('jobDashboard');
  const navigate = useNavigate();

  const applicationId = candidate?.id as string | undefined;
  const candidateId = (candidate?.candidate_id || candidate?.user_id) as string | undefined;

  const { data: activities = [], isLoading } = useCandidateActivity(
    open ? applicationId : undefined,
    open ? candidateId : undefined,
  );

  if (!candidate) return null;

  const name = (candidate.full_name as string) || 'Candidate';
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const title = (candidate.current_title as string) || '';
  const email = (candidate.email as string) || '';
  const matchScore = (candidate.match_score as number) || 0;
  const stageIndex = (candidate.current_stage_index as number) || 0;
  const stageName = stages[stageIndex]?.name || `Stage ${stageIndex}`;

  const openFullProfile = () => {
    if (candidateId) {
      navigate(`/candidate/${candidateId}?fromJob=${jobId}&stage=${encodeURIComponent(stageName)}&stageIndex=${stageIndex}`);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-[480px] max-w-full p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border/20">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              {candidate.avatar_url && <AvatarImage src={candidate.avatar_url as string} />}
              <AvatarFallback className="text-sm bg-muted/50">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-sm font-bold truncate">{name}</SheetTitle>
              {title && <p className="text-xs text-muted-foreground truncate">{title}</p>}
              {email && <p className="text-[10px] text-muted-foreground/60 truncate">{email}</p>}
            </div>
            {matchScore > 0 && (
              <MatchScoreRing score={matchScore} size={36} />
            )}
          </div>

          <div className="flex items-center gap-2 mt-3">
            <Badge variant="secondary" className="text-[10px]">{stageName}</Badge>
            {onAdvance && (
              <Button variant="ghost" size="sm" className="h-6 gap-1 text-[10px] text-success" onClick={() => onAdvance(candidate)}>
                <ArrowRight className="w-3 h-3" /> {t('title.advance', 'Advance')}
              </Button>
            )}
            {onReject && (
              <Button variant="ghost" size="sm" className="h-6 gap-1 text-[10px] text-destructive" onClick={() => onReject(candidate)}>
                <X className="w-3 h-3" /> {t('title.reject', 'Reject')}
              </Button>
            )}
            {onEmail && (
              <Button variant="ghost" size="sm" className="h-6 gap-1 text-[10px]" onClick={() => onEmail(candidate)}>
                <Mail className="w-3 h-3" /> {t('title.email', 'Email')}
              </Button>
            )}
            {onScheduleInterview && (
              <Button variant="ghost" size="sm" className="h-6 gap-1 text-[10px]" onClick={() => onScheduleInterview(candidate)}>
                <Calendar className="w-3 h-3" /> {t('title.scheduleInterview', 'Interview')}
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-5 py-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">
              {t('slideOver.activityTimeline', 'Activity Timeline')}
            </h4>
            <ActivityTimeline items={activities} isLoading={isLoading} />
          </div>
        </ScrollArea>

        <div className="px-5 py-3 border-t border-border/20">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 text-xs"
            onClick={openFullProfile}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {t('slideOver.openFullProfile', 'Open Full Profile')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
});

CandidateSlideOver.displayName = 'CandidateSlideOver';
