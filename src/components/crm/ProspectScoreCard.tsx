import { motion } from 'framer-motion';
import { TrendingUp, Building2, Briefcase, MessageSquare, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ProspectScoreBreakdown, useCRMProspectScoring } from '@/hooks/useCRMProspectScoring';
import { cn } from '@/lib/utils';

interface ProspectScoreCardProps {
  prospectId: string;
  currentScore?: number;
  scoreBreakdown?: ProspectScoreBreakdown | null;
  onScoreUpdated?: (score: ProspectScoreBreakdown) => void;
}

const scoreCategories = [
  { key: 'engagement', label: 'Engagement', max: 40, icon: TrendingUp, color: 'text-emerald-500' },
  { key: 'companyFit', label: 'Company Fit', max: 25, icon: Building2, color: 'text-blue-500' },
  { key: 'roleSeniority', label: 'Seniority', max: 20, icon: Briefcase, color: 'text-purple-500' },
  { key: 'replySentiment', label: 'Sentiment', max: 15, icon: MessageSquare, color: 'text-amber-500' },
] as const;

export function ProspectScoreCard({ prospectId, currentScore = 0, scoreBreakdown, onScoreUpdated }: ProspectScoreCardProps) {
  const { calculateProspectScore, loading } = useCRMProspectScoring();

  const handleRecalculate = async () => {
    const result = await calculateProspectScore(prospectId);
    if (result && onScoreUpdated) {
      onScoreUpdated(result);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-500';
    if (score >= 50) return 'text-amber-500';
    if (score >= 30) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 70) return 'Hot Lead';
    if (score >= 50) return 'Warm Lead';
    if (score >= 30) return 'Cold Lead';
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

      {/* Main Score */}
      <div className="flex items-center gap-4 mb-6">
        <div className={cn(
          "text-5xl font-bold",
          getScoreColor(currentScore)
        )}>
          {currentScore}
        </div>
        <div>
          <div className={cn("text-sm font-medium", getScoreColor(currentScore))}>
            {getScoreLabel(currentScore)}
          </div>
          <div className="text-xs text-muted-foreground">out of 100</div>
        </div>
      </div>

      {/* Score Breakdown */}
      {scoreBreakdown && (
        <div className="space-y-3">
          {scoreCategories.map(({ key, label, max, icon: Icon, color }) => {
            const value = scoreBreakdown[key as keyof ProspectScoreBreakdown] as number;
            const percentage = (value / max) * 100;
            
            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("w-4 h-4", color)} />
                    <span className="text-muted-foreground">{label}</span>
                  </div>
                  <span className="font-medium">{value}/{max}</span>
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
