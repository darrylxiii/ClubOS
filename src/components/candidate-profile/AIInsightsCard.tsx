import { motion } from 'framer-motion';
import { Sparkles, ThumbsUp, AlertTriangle, Brain } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { candidateProfileTokens } from '@/config/candidate-profile-tokens';
import { cn } from '@/lib/utils';

interface AIInsightsCardProps {
  candidate: Record<string, any>;
  className?: string;
}

export function AIInsightsCard({ candidate, className }: AIInsightsCardProps) {
  const strengths = Array.isArray(candidate.ai_strengths) ? candidate.ai_strengths : [];
  const concerns = Array.isArray(candidate.ai_concerns) ? candidate.ai_concerns : [];
  const personality = candidate.personality_insights;

  const hasData = strengths.length > 0 || concerns.length > 0 || personality;
  if (!hasData) return null;

  const personalityTraits = personality && typeof personality === 'object' && !Array.isArray(personality)
    ? Object.entries(personality as Record<string, any>)
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...candidateProfileTokens.animations.smooth, delay: 0.05 }}
      className={cn(
        candidateProfileTokens.glass.card,
        'rounded-xl p-4 sm:p-5',
        candidateProfileTokens.shadows.md,
        className
      )}
    >
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold tracking-tight">AI Insights</h3>
        <span className="text-[10px] text-muted-foreground ml-auto">Powered by QUIN</span>
      </div>

      <div className="space-y-4">
        {/* Strengths */}
        {strengths.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-400">Key Strengths</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {strengths.map((s: string, i: number) => (
                <Badge key={i} variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Concerns */}
        {concerns.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-medium text-amber-400">Key Concerns</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {concerns.map((c: string, i: number) => (
                <Badge key={i} variant="outline" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/20">
                  {c}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Personality Insights */}
        {personalityTraits.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-foreground">Personality Traits</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {personalityTraits.slice(0, 6).map(([trait, value]) => (
                <div key={trait} className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-2.5 py-1.5">
                  <span className="text-xs text-muted-foreground capitalize truncate">{trait.replace(/_/g, ' ')}</span>
                  <span className="text-xs font-semibold tabular-nums">
                    {typeof value === 'number' ? `${value}%` : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
