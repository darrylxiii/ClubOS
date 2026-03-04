import { motion } from '@/lib/motion';
import { TrendingUp, Building2, Briefcase, MessageSquare, RefreshCw, Star, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useCRMLeadScoring } from '@/hooks/useCRMLeadScoring';
import { LeadScoreBreakdown } from '@/types/crm';
import { cn } from '@/lib/utils';

interface ProspectScoreCardProps {
  prospectId: string;
  currentScore?: number;
  scoreBreakdown?: LeadScoreBreakdown | null;
  onScoreUpdated?: (score: LeadScoreBreakdown) => void;
}

const scoreCategories = [
  { key: 'engagement', label: 'Engagement', max: 40, icon: TrendingUp, color: 'text-emerald-500' },
  { key: 'profile', label: 'Profile', max: 30, icon: Users, color: 'text-blue-500' },
  { key: 'assessment', label: 'Stage', max: 15, icon: Briefcase, color: 'text-purple-500' },
  { key: 'referrals', label: 'Source', max: 10, icon: Star, color: 'text-amber-500' },
  { key: 'skills_match', label: 'Sentiment', max: 5, icon: MessageSquare, color: 'text-rose-500' },
] as const;

export function ProspectScoreCard({ prospectId, currentScore = 0, scoreBreakdown: externalBreakdown, onScoreUpdated }: ProspectScoreCardProps) {
  const { scoreBreakdown: hookBreakdown, loading, recalculateScore } = useCRMLeadScoring(prospectId);

  const breakdown = externalBreakdown || hookBreakdown;
  const score = breakdown?.total ?? currentScore;

  const handleRecalculate = async () => {
    recalculateScore();
  };

  const getScoreColor = (s: number) => {
    if (s >= 70) return 'text-emerald-500';
    if (s >= 50) return 'text-amber-500';
    if (s >= 30) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreLabel = (s: number) => {
    if (s >= 70) return 'Hot Lead';
    if (s >= 50) return 'Warm Lead';
    if (s >= 30) return 'Cold Lead';
    return 'Unqualified';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl rounded-xl border border-border/50 p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Lead Score</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRecalculate}
          disabled={loading}
          className="h-8"
        >
          <RefreshCw className={cn("w-4 h-4 mr-1", loading && "animate-spin")} />
          Recalculate
        </Button>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className={cn("text-5xl font-bold", getScoreColor(score))}>
          {score}
        </div>
        <div>
          <div className={cn("text-sm font-medium", getScoreColor(score))}>
            {getScoreLabel(score)}
          </div>
          <div className="text-xs text-muted-foreground">out of 100</div>
        </div>
      </div>

      {breakdown && (
        <div className="space-y-3">
          {scoreCategories.map(({ key, label, max, icon: Icon, color }) => {
            const value = breakdown[key as keyof LeadScoreBreakdown] as number;
            const percentage = (value / max) * 100;

            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("w-4 h-4", color)} />
                    <span className="text-muted-foreground">{label}</span>
                  </div>
                  <span className="font-medium">{Math.round(value)}/{max}</span>
                </div>
                <Progress value={percentage} className="h-1.5" />
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
