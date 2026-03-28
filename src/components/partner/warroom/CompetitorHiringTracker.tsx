import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { motion } from '@/lib/motion';
import { Building2, AlertCircle, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { CompetitorRole, ThreatLevel } from '@/hooks/useTalentWarRoom';

interface CompetitorHiringTrackerProps {
  competitors: CompetitorRole[];
  threatLevel: ThreatLevel;
  className?: string;
}

export function CompetitorHiringTracker({
  competitors,
  threatLevel,
  className,
}: CompetitorHiringTrackerProps) {
  const { t } = useTranslation('partner');
  const isHighThreat = threatLevel === 'high' || threatLevel === 'critical';

  // Group by skillset/category for the overlap count
  const skillsetCounts: Record<string, number> = {};
  for (const c of competitors) {
    skillsetCounts[c.overlapSkillset] = (skillsetCounts[c.overlapSkillset] || 0) + 1;
  }

  // Count unique companies
  const uniqueCompanies = new Set(competitors.map((c) => c.anonymizedCompany));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'p-5 rounded-xl bg-card/20 backdrop-blur border border-border/20',
        isHighThreat && 'border-amber-500/30',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Building2 className={cn('h-4 w-4', isHighThreat ? 'text-amber-500' : 'text-muted-foreground')} />
          <h3 className="text-sm font-semibold">
            {t('warRoom.competitors.title', 'Competitor Hiring')}
          </h3>
        </div>
        {uniqueCompanies.size > 0 && (
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] py-0 px-1.5',
              isHighThreat
                ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                : 'bg-primary/10 text-primary border-primary/30'
            )}
          >
            {t('warRoom.competitors.activeCount', '{{count}} active', { count: uniqueCompanies.size })}
          </Badge>
        )}
      </div>

      {/* Alert banner when overlapping */}
      {Object.entries(skillsetCounts).some(([, count]) => count >= 3) && (
        <div className="mb-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <span className="text-[11px] text-amber-500">
            {t(
              'warRoom.competitors.overlapAlert',
              '{{count}} competitors hiring for the same skillset',
              {
                count: Math.max(
                  ...Object.values(skillsetCounts)
                ),
              }
            )}
          </span>
        </div>
      )}

      {/* Competitor list */}
      {competitors.length === 0 ? (
        <p className="text-xs text-muted-foreground/60 py-4 text-center">
          {t('warRoom.competitors.empty', 'No overlapping competitor activity detected')}
        </p>
      ) : (
        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
          {competitors.slice(0, 15).map((role, i) => (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.2 }}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{role.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {role.anonymizedCompany} &middot; {role.overlapSkillset}
                </p>
              </div>

              {(role.salaryMin || role.salaryMax) && (
                <div className="flex items-center gap-1 shrink-0">
                  <DollarSign className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {formatSalaryRange(role.salaryMin, role.salaryMax)}
                  </span>
                </div>
              )}

              <Badge
                variant="outline"
                className="text-[9px] py-0 px-1 shrink-0 bg-muted/20 border-border/30"
              >
                {formatTimeAgo(role.postedAt)}
              </Badge>
            </motion.div>
          ))}
        </div>
      )}

      {/* Skillset summary */}
      {Object.keys(skillsetCounts).length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/10 flex flex-wrap gap-1.5">
          {Object.entries(skillsetCounts).map(([skill, count]) => (
            <Badge
              key={skill}
              variant="outline"
              className={cn(
                'text-[10px] py-0 px-1.5',
                count >= 3
                  ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                  : count >= 2
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                    : 'bg-muted/20 text-muted-foreground border-border/30'
              )}
            >
              {skill}: {count}
            </Badge>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────

function formatSalaryRange(min: number | null, max: number | null): string {
  const fmt = (n: number) => {
    if (n >= 1000) return `${Math.round(n / 1000)}k`;
    return String(n);
  };
  if (min && max) return `${fmt(min)}-${fmt(max)}`;
  if (max) return `up to ${fmt(max)}`;
  if (min) return `from ${fmt(min)}`;
  return '';
}

function formatTimeAgo(dateStr: string): string {
  const days = Math.round((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return '1d';
  if (days < 30) return `${days}d`;
  return `${Math.round(days / 30)}mo`;
}
