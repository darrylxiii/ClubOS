import { motion } from 'framer-motion';
import { DollarSign, EyeOff } from 'lucide-react';
import { candidateProfileTokens } from '@/config/candidate-profile-tokens';
import { formatCurrencyCompact, type SupportedCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';

interface CompensationCardProps {
  candidate: Record<string, any>;
  className?: string;
}

export function CompensationCard({ candidate, className }: CompensationCardProps) {
  if (candidate.salary_preference_hidden) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...candidateProfileTokens.animations.smooth, delay: 0.1 }}
        className={cn(
          candidateProfileTokens.glass.card,
          'rounded-xl p-4 sm:p-5',
          candidateProfileTokens.shadows.sm,
          className
        )}
      >
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold tracking-tight">Compensation</h3>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <EyeOff className="w-4 h-4" />
          <span className="text-xs">Hidden by candidate</span>
        </div>
      </motion.div>
    );
  }

  const currency = (candidate.preferred_currency || 'EUR') as SupportedCurrency;
  const currentMin = candidate.current_salary_min;
  const currentMax = candidate.current_salary_max;
  const desiredMin = candidate.desired_salary_min;
  const desiredMax = candidate.desired_salary_max;

  const hasCurrentComp = currentMin != null || currentMax != null;
  const hasDesiredComp = desiredMin != null || desiredMax != null;

  if (!hasCurrentComp && !hasDesiredComp) return null;

  // Calculate overlap for visual bar
  const allValues = [currentMin, currentMax, desiredMin, desiredMax].filter((v): v is number => v != null);
  const globalMin = Math.min(...allValues);
  const globalMax = Math.max(...allValues);
  const range = globalMax - globalMin || 1;

  const toPercent = (v: number) => ((v - globalMin) / range) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...candidateProfileTokens.animations.smooth, delay: 0.1 }}
      className={cn(
        candidateProfileTokens.glass.card,
        'rounded-xl p-4 sm:p-5',
        candidateProfileTokens.shadows.sm,
        className
      )}
    >
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold tracking-tight">Compensation Intelligence</h3>
      </div>

      <div className="space-y-3">
        {hasCurrentComp && (
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">Current</p>
            <p className="text-sm font-medium">
              {formatCurrencyCompact(currentMin, currency)} – {formatCurrencyCompact(currentMax, currency)}
            </p>
          </div>
        )}
        {hasDesiredComp && (
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">Desired</p>
            <p className="text-sm font-medium">
              {formatCurrencyCompact(desiredMin, currency)} – {formatCurrencyCompact(desiredMax, currency)}
            </p>
          </div>
        )}

        {/* Visual comparison bar */}
        {hasCurrentComp && hasDesiredComp && (
          <div className="relative h-3 bg-muted/50 rounded-full mt-2 overflow-hidden">
            {currentMin != null && currentMax != null && (
              <div
                className="absolute h-full bg-blue-500/40 rounded-full"
                style={{
                  left: `${toPercent(currentMin)}%`,
                  width: `${toPercent(currentMax) - toPercent(currentMin)}%`,
                }}
              />
            )}
            {desiredMin != null && desiredMax != null && (
              <div
                className="absolute h-full bg-emerald-500/40 rounded-full border border-emerald-500/30"
                style={{
                  left: `${toPercent(desiredMin)}%`,
                  width: `${toPercent(desiredMax) - toPercent(desiredMin)}%`,
                }}
              />
            )}
          </div>
        )}
        {hasCurrentComp && hasDesiredComp && (
          <div className="flex gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500/50" /> Current
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500/50" /> Desired
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
