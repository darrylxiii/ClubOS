import { useTranslation } from 'react-i18next';
import { motion } from '@/lib/motion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Shield, ChevronRight } from 'lucide-react';
import type { ThreatSummary } from '@/hooks/useAIChiefOfStaff';

// ── Config ─────────────────────────────────────────────────────────

const LEVEL_CONFIG: Record<
  ThreatSummary['overallLevel'],
  { label: string; dotClass: string; badgeClass: string; bgClass: string }
> = {
  low: {
    label: 'Low',
    dotClass: 'bg-emerald-500',
    badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
    bgClass: 'border-emerald-500/20',
  },
  medium: {
    label: 'Medium',
    dotClass: 'bg-amber-500',
    badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    bgClass: 'border-amber-500/20',
  },
  high: {
    label: 'High',
    dotClass: 'bg-orange-500',
    badgeClass: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
    bgClass: 'border-orange-500/20',
  },
  critical: {
    label: 'Critical',
    dotClass: 'bg-rose-500',
    badgeClass: 'bg-rose-500/10 text-rose-500 border-rose-500/30',
    bgClass: 'border-rose-500/20',
  },
};

// ── Props ──────────────────────────────────────────────────────────

interface ThreatSummaryStripProps {
  threat: ThreatSummary;
  className?: string;
}

// ── Component ──────────────────────────────────────────────────────

export function ThreatSummaryStrip({ threat, className }: ThreatSummaryStripProps) {
  const { t } = useTranslation('partner');
  const config = LEVEL_CONFIG[threat.overallLevel];

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 rounded-xl',
        'bg-card/30 backdrop-blur border',
        config.bgClass,
        className,
      )}
    >
      {/* Shield icon + pulsing dot */}
      <div className="flex items-center gap-2 shrink-0">
        <Shield className="h-4 w-4 text-muted-foreground" />
        <div className="relative">
          <div className={cn('h-2.5 w-2.5 rounded-full', config.dotClass)} />
          {(threat.overallLevel === 'high' || threat.overallLevel === 'critical') && (
            <div
              className={cn(
                'absolute inset-0 h-2.5 w-2.5 rounded-full animate-ping',
                config.dotClass,
                'opacity-50',
              )}
            />
          )}
        </div>
      </div>

      {/* Label */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-medium">
          {t('chiefOfStaff.threat.label', 'Threat Level')}:
        </span>
        <Badge variant="outline" className={cn('text-[10px] py-0 px-1.5', config.badgeClass)}>
          {t(`chiefOfStaff.threat.levels.${threat.overallLevel}`, config.label)}
        </Badge>
      </div>

      {/* Top threats */}
      {threat.topThreats.length > 0 && (
        <div className="hidden sm:flex items-center gap-2 flex-1 min-w-0">
          <span className="text-[10px] text-muted-foreground">--</span>
          {threat.topThreats.map((t, i) => (
            <span key={i} className="text-[11px] text-muted-foreground truncate">
              {t}
              {i < threat.topThreats.length - 1 ? ' | ' : ''}
            </span>
          ))}
        </div>
      )}

      {/* Link to war room */}
      <div className="flex items-center gap-1 shrink-0 text-xs text-primary ml-auto cursor-pointer hover:underline">
        <span className="hidden md:inline">
          {t('chiefOfStaff.threat.viewWarRoom', 'War Room')}
        </span>
        <ChevronRight className="h-3.5 w-3.5" />
      </div>
    </motion.div>
  );
}
