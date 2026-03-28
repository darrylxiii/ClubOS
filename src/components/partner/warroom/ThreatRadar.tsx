import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { motion } from '@/lib/motion';
import { Shield, AlertTriangle, Users, DollarSign } from 'lucide-react';
import type { ThreatLevel } from '@/hooks/useTalentWarRoom';

interface ThreatRadarProps {
  threatLevel: ThreatLevel;
  competitorCount: number;
  flightRiskCount: number;
  avgSalaryPressure: number;
  className?: string;
}

const LEVEL_CONFIG: Record<ThreatLevel, { color: string; ringColor: string; label: string; bgGlow: string }> = {
  low: {
    color: 'text-emerald-500',
    ringColor: 'stroke-emerald-500/30',
    label: 'Low',
    bgGlow: 'shadow-emerald-500/10',
  },
  medium: {
    color: 'text-amber-500',
    ringColor: 'stroke-amber-500/30',
    label: 'Medium',
    bgGlow: 'shadow-amber-500/10',
  },
  high: {
    color: 'text-orange-500',
    ringColor: 'stroke-orange-500/30',
    label: 'High',
    bgGlow: 'shadow-orange-500/10',
  },
  critical: {
    color: 'text-rose-500',
    ringColor: 'stroke-rose-500/40',
    label: 'Critical',
    bgGlow: 'shadow-rose-500/20',
  },
};

export function ThreatRadar({
  threatLevel,
  competitorCount,
  flightRiskCount,
  avgSalaryPressure,
  className,
}: ThreatRadarProps) {
  const { t } = useTranslation('partner');
  const config = LEVEL_CONFIG[threatLevel];
  const isHighThreat = threatLevel === 'high' || threatLevel === 'critical';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'p-5 rounded-xl bg-card/20 backdrop-blur border border-border/20',
        isHighThreat && 'border-rose-500/30',
        config.bgGlow,
        className
      )}
    >
      <div className="flex items-center gap-3 mb-4">
        <Shield className={cn('h-5 w-5', config.color)} />
        <h3 className="text-sm font-semibold">
          {t('warRoom.threatRadar.title', 'Threat Radar')}
        </h3>
      </div>

      {/* Radar visualization */}
      <div className="flex items-center gap-6">
        <div className="relative w-28 h-28 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Concentric rings */}
            {[40, 30, 20, 10].map((r, i) => (
              <circle
                key={r}
                cx="50"
                cy="50"
                r={r}
                fill="none"
                strokeWidth="0.5"
                className={cn(
                  'stroke-border/20',
                  i === 0 && config.ringColor
                )}
              />
            ))}
            {/* Cross lines */}
            <line x1="50" y1="10" x2="50" y2="90" strokeWidth="0.3" className="stroke-border/15" />
            <line x1="10" y1="50" x2="90" y2="50" strokeWidth="0.3" className="stroke-border/15" />

            {/* Threat dots */}
            {competitorCount > 0 && (
              <ThreatDot
                cx={50 + Math.min(competitorCount * 3, 30)}
                cy={50 - Math.min(competitorCount * 2, 25)}
                level={competitorCount >= 5 ? 'high' : competitorCount >= 2 ? 'medium' : 'low'}
                pulse={isHighThreat}
              />
            )}
            {flightRiskCount > 0 && (
              <ThreatDot
                cx={50 - Math.min(flightRiskCount * 4, 28)}
                cy={50 - Math.min(flightRiskCount * 3, 20)}
                level={flightRiskCount >= 3 ? 'high' : flightRiskCount >= 1 ? 'medium' : 'low'}
                pulse={isHighThreat}
              />
            )}
            {Math.abs(avgSalaryPressure) > 1 && (
              <ThreatDot
                cx={50 + Math.min(Math.abs(avgSalaryPressure) * 3, 25)}
                cy={50 + Math.min(Math.abs(avgSalaryPressure) * 2, 20)}
                level={Math.abs(avgSalaryPressure) >= 5 ? 'high' : 'medium'}
                pulse={isHighThreat}
              />
            )}
          </svg>

          {/* Center label */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn('text-xs font-bold', config.color)}>
              {t(`warRoom.threatRadar.levels.${threatLevel}`, config.label)}
            </span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="flex-1 space-y-3">
          <ThreatBreakdownRow
            icon={Users}
            label={t('warRoom.threatRadar.competitors', 'Competitors')}
            value={competitorCount}
            severity={competitorCount >= 5 ? 'high' : competitorCount >= 2 ? 'medium' : 'low'}
          />
          <ThreatBreakdownRow
            icon={AlertTriangle}
            label={t('warRoom.threatRadar.flightRisks', 'Flight Risks')}
            value={flightRiskCount}
            severity={flightRiskCount >= 3 ? 'high' : flightRiskCount >= 1 ? 'medium' : 'low'}
          />
          <ThreatBreakdownRow
            icon={DollarSign}
            label={t('warRoom.threatRadar.salaryPressure', 'Salary Pressure')}
            value={`${avgSalaryPressure > 0 ? '+' : ''}${avgSalaryPressure}%`}
            severity={Math.abs(avgSalaryPressure) >= 5 ? 'high' : Math.abs(avgSalaryPressure) >= 2 ? 'medium' : 'low'}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────

function ThreatDot({
  cx,
  cy,
  level,
  pulse,
}: {
  cx: number;
  cy: number;
  level: 'low' | 'medium' | 'high';
  pulse: boolean;
}) {
  const fills: Record<string, string> = {
    low: 'fill-emerald-500',
    medium: 'fill-amber-500',
    high: 'fill-rose-500',
  };

  return (
    <g>
      {pulse && (
        <circle cx={cx} cy={cy} r="5" className={cn(fills[level], 'opacity-30')}>
          <animate
            attributeName="r"
            values="3;7;3"
            dur="2s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.3;0;0.3"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
      )}
      <circle cx={cx} cy={cy} r="3" className={fills[level]} />
    </g>
  );
}

function ThreatBreakdownRow({
  icon: Icon,
  label,
  value,
  severity,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  severity: 'low' | 'medium' | 'high';
}) {
  const colors: Record<string, string> = {
    low: 'text-emerald-500',
    medium: 'text-amber-500',
    high: 'text-rose-500',
  };

  return (
    <div className="flex items-center gap-2">
      <Icon className={cn('h-3.5 w-3.5', colors[severity])} />
      <span className="text-xs text-muted-foreground flex-1">{label}</span>
      <span className={cn('text-xs font-semibold tabular-nums', colors[severity])}>
        {value}
      </span>
    </div>
  );
}
