import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { motion } from '@/lib/motion';
import { AlertTriangle, ChevronRight, Phone } from 'lucide-react';
import { ConfidenceBadge } from '@/components/partner/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { FlightRisk } from '@/hooks/useTalentWarRoom';

interface FlightRiskRadarProps {
  flightRisks: FlightRisk[];
  className?: string;
}

function getRiskColor(score: number): { bg: string; text: string; border: string } {
  if (score >= 75) return { bg: 'bg-rose-500/10', text: 'text-rose-500', border: 'border-rose-500/20' };
  if (score >= 50) return { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20' };
  return { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20' };
}

export function FlightRiskRadar({ flightRisks, className }: FlightRiskRadarProps) {
  const { t } = useTranslation('partner');

  const highRiskCount = flightRisks.filter((r) => r.riskScore >= 75).length;

  const handlePrioritizeOutreach = (candidate: FlightRisk) => {
    toast.success(
      t('warRoom.flightRisk.outreachQueued', 'Outreach prioritized'),
      {
        description: t(
          'warRoom.flightRisk.outreachDesc',
          '{{name}} has been moved to priority outreach queue',
          { name: candidate.candidateName }
        ),
      }
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'p-5 rounded-xl bg-card/20 backdrop-blur border border-border/20',
        highRiskCount > 0 && 'border-rose-500/20',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className={cn('h-4 w-4', highRiskCount > 0 ? 'text-rose-500' : 'text-muted-foreground')} />
          <h3 className="text-sm font-semibold">
            {t('warRoom.flightRisk.title', 'Flight Risk Radar')}
          </h3>
        </div>
        {highRiskCount > 0 && (
          <Badge
            variant="outline"
            className="text-[10px] py-0 px-1.5 bg-rose-500/10 text-rose-500 border-rose-500/30"
          >
            {t('warRoom.flightRisk.highRiskCount', '{{count}} high risk', { count: highRiskCount })}
          </Badge>
        )}
      </div>

      {/* Risk list */}
      {flightRisks.length === 0 ? (
        <p className="text-xs text-muted-foreground/60 py-4 text-center">
          {t('warRoom.flightRisk.empty', 'No flight risks detected in your pipeline')}
        </p>
      ) : (
        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {flightRisks.map((risk, i) => {
            const colors = getRiskColor(risk.riskScore);

            return (
              <motion.div
                key={risk.id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.04 * i, duration: 0.2 }}
                className={cn(
                  'p-3 rounded-lg border transition-colors',
                  colors.bg,
                  colors.border,
                  'hover:bg-muted/20'
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{risk.candidateName}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {risk.jobTitle} &middot; {risk.currentStage}
                    </p>
                  </div>
                  <ConfidenceBadge
                    score={risk.riskScore}
                    label={`${risk.riskScore}% risk`}
                    size="sm"
                  />
                </div>

                {/* Risk factors */}
                {risk.riskFactors.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {risk.riskFactors.slice(0, 3).map((factor) => (
                      <span
                        key={factor}
                        className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted/30 text-muted-foreground"
                      >
                        {factor}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] gap-1 px-2 w-full justify-between hover:bg-primary/10"
                  onClick={() => handlePrioritizeOutreach(risk)}
                >
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {t('warRoom.flightRisk.prioritize', 'Prioritize Outreach')}
                  </span>
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
