import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from '@/lib/motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  UserCheck,
  ListPlus,
  Mail,
  Star,
  Clock,
  ArrowUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { SilverMedalist } from '@/hooks/useNurturingSequence';

interface SilverMedalistPoolProps {
  medalists: SilverMedalist[];
  className?: string;
}

type SortMode = 'quality' | 'recency';

const ACTIVITY_BADGE_CONFIG: Record<
  SilverMedalist['activityStatus'],
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; fallbackLabel: string }
> = {
  profile_updated: { label: 'nurturing.pool.profileUpdated', variant: 'default', fallbackLabel: 'Profile updated' },
  applied_elsewhere: { label: 'nurturing.pool.appliedElsewhere', variant: 'secondary', fallbackLabel: 'Applied elsewhere' },
  inactive: { label: 'nurturing.pool.inactive', variant: 'outline', fallbackLabel: 'Inactive' },
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatStageLabel(stage: string): string {
  return stage
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function SilverMedalistPool({ medalists, className }: SilverMedalistPoolProps) {
  const { t } = useTranslation('partner');
  const [sortMode, setSortMode] = useState<SortMode>('quality');

  const sorted = useMemo(() => {
    const copy = [...medalists];
    if (sortMode === 'quality') {
      copy.sort((a, b) => (b.scorecardRating ?? 0) - (a.scorecardRating ?? 0));
    } else {
      copy.sort(
        (a, b) =>
          new Date(b.lastActivityDate).getTime() - new Date(a.lastActivityDate).getTime(),
      );
    }
    return copy;
  }, [medalists, sortMode]);

  const handleReachOut = (medalist: SilverMedalist) => {
    toast.success(
      t('nurturing.pool.reachOutSuccess', 'Re-engagement email queued for {{name}}', {
        name: medalist.candidateName,
      }),
    );
  };

  const handleAddToShortlist = (medalist: SilverMedalist) => {
    toast.success(
      t('nurturing.pool.shortlistSuccess', '{{name}} added to shortlist', {
        name: medalist.candidateName,
      }),
    );
  };

  if (medalists.length === 0) {
    return (
      <div className={cn('text-center py-8 text-sm text-muted-foreground', className)}>
        {t('nurturing.pool.empty', 'No silver medalists in the talent pool yet.')}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Sort controls */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <UserCheck className="h-4 w-4" />
          {t('nurturing.pool.title', 'Silver Medalist Pool')}
          <Badge variant="outline" className="ml-1 text-[10px]">
            {medalists.length}
          </Badge>
        </h3>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
            <SelectTrigger className="h-8 w-[140px] text-xs bg-card/30 border-border/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="quality">
                {t('nurturing.pool.sortQuality', 'Quality Score')}
              </SelectItem>
              <SelectItem value="recency">
                {t('nurturing.pool.sortRecency', 'Most Recent')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Card list */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        <AnimatePresence mode="popLayout">
          {sorted.map((medalist, index) => {
            const badge = ACTIVITY_BADGE_CONFIG[medalist.activityStatus];
            return (
              <motion.div
                key={medalist.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.02, duration: 0.2 }}
                className="p-4 rounded-xl bg-card/30 backdrop-blur border border-border/20 hover:border-primary/20 transition-colors duration-200 space-y-3"
              >
                {/* Top row: avatar + info */}
                <div className="flex items-start gap-3">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={medalist.avatarUrl || undefined} alt={medalist.candidateName} />
                    <AvatarFallback className="text-[10px]">
                      {getInitials(medalist.candidateName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{medalist.candidateName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {medalist.originalRole}
                    </p>
                  </div>
                  <Badge variant={badge.variant} className="text-[10px] shrink-0">
                    {t(badge.label, badge.fallbackLabel)}
                  </Badge>
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {t('nurturing.pool.rejectedAt', 'Rejected at')}{' '}
                    {formatStageLabel(medalist.rejectionStage)}
                  </span>
                  {medalist.scorecardRating != null && (
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-amber-500" />
                      {medalist.scorecardRating}/5
                    </span>
                  )}
                </div>

                {/* Last activity */}
                <p className="text-[10px] text-muted-foreground">
                  {t('nurturing.pool.lastActivity', 'Last activity')}:{' '}
                  {new Date(medalist.lastActivityDate).toLocaleDateString()}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs flex-1 gap-1.5"
                    onClick={() => handleReachOut(medalist)}
                  >
                    <Mail className="h-3 w-3" />
                    {t('nurturing.pool.reachOut', 'Reach out')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs flex-1 gap-1.5"
                    onClick={() => handleAddToShortlist(medalist)}
                  >
                    <ListPlus className="h-3 w-3" />
                    {t('nurturing.pool.addToShortlist', 'Shortlist')}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
