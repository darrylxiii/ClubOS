import { motion } from 'framer-motion';
import { Sparkles, Eye, EyeOff, TrendingUp, Search, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TierBadge, MoveProbabilityBadge } from '@/components/talent-pool/TierBadge';
import { candidateProfileTokens } from '@/config/candidate-profile-tokens';
import { cn } from '@/lib/utils';

interface TalentIntelligenceBannerProps {
  candidate: Record<string, any>;
  className?: string;
}

const recommendationConfig: Record<string, { label: string; className: string }> = {
  strong_hire: { label: 'Strong Hire', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  hire: { label: 'Hire', className: 'bg-green-500/15 text-green-400 border-green-500/30' },
  maybe: { label: 'Maybe', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  no_hire: { label: 'No Hire', className: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

export function TalentIntelligenceBanner({ candidate, className }: TalentIntelligenceBannerProps) {
  const {
    talent_tier,
    tier_score,
    move_probability,
    actively_looking,
    ghost_mode_enabled,
    ai_recommendation,
  } = candidate;

  const hasData = talent_tier || move_probability != null || ai_recommendation;
  if (!hasData) return null;

  const recConfig = ai_recommendation ? recommendationConfig[ai_recommendation] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={candidateProfileTokens.animations.smooth}
      className={cn(
        candidateProfileTokens.glass.card,
        'rounded-xl p-4 sm:p-5',
        candidateProfileTokens.shadows.md,
        className
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold tracking-tight">Talent Intelligence</h3>
        <span className="text-[10px] text-muted-foreground ml-auto">Powered by QUIN</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {talent_tier && (
          <TierBadge tier={talent_tier} size="md" />
        )}

        {tier_score != null && (
          <Badge variant="outline" className="gap-1 text-xs font-medium">
            <TrendingUp className="w-3 h-3" />
            Score: {tier_score}
          </Badge>
        )}

        {move_probability != null && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Move:</span>
            <MoveProbabilityBadge probability={move_probability} size="md" />
          </div>
        )}

        {actively_looking != null && (
          <Badge
            variant="outline"
            className={cn(
              'gap-1 text-xs font-medium',
              actively_looking
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-muted text-muted-foreground border-border'
            )}
          >
            <Search className="w-3 h-3" />
            {actively_looking ? 'Actively Looking' : 'Passive'}
          </Badge>
        )}

        {ghost_mode_enabled && (
          <Badge variant="outline" className="gap-1 text-xs font-medium bg-violet-500/10 text-violet-400 border-violet-500/20">
            <EyeOff className="w-3 h-3" />
            Ghost Mode
          </Badge>
        )}

        {recConfig && (
          <Badge variant="outline" className={cn('gap-1 text-xs font-semibold', recConfig.className)}>
            <ShieldCheck className="w-3 h-3" />
            {recConfig.label}
          </Badge>
        )}
      </div>
    </motion.div>
  );
}
