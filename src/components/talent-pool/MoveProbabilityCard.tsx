import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { TrendingUp, RefreshCw, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMoveProbability } from '@/hooks/useTalentPool';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

interface MoveProbabilityCardProps {
  candidateId: string;
  className?: string;
}

interface FactorBreakdown {
  tenure: number;
  engagement: number;
  response_rate: number;
  linkedin_activity: number;
  career_velocity: number;
  availability: number;
  market_conditions: number;
  relationship: number;
}

const factorLabels: Record<keyof FactorBreakdown, { label: string; description: string }> = {
  tenure: { label: 'Tenure Score', description: 'Based on time in current role' },
  engagement: { label: 'Engagement', description: 'Recent interaction activity' },
  response_rate: { label: 'Response Rate', description: 'Historical response patterns' },
  linkedin_activity: { label: 'LinkedIn Activity', description: 'Profile activity changes' },
  career_velocity: { label: 'Career Velocity', description: 'Career progression speed' },
  availability: { label: 'Availability', description: 'Stated availability status' },
  market_conditions: { label: 'Market Conditions', description: 'Industry demand factors' },
  relationship: { label: 'Relationship', description: 'Relationship strength with TQC' },
};

const factorWeights: Record<keyof FactorBreakdown, number> = {
  tenure: 0.20,
  engagement: 0.15,
  response_rate: 0.15,
  linkedin_activity: 0.10,
  career_velocity: 0.10,
  availability: 0.15,
  market_conditions: 0.10,
  relationship: 0.05,
};

function getScoreColor(score: number): string {
  if (score >= 70) return 'text-green-400';
  if (score >= 40) return 'text-yellow-400';
  return 'text-muted-foreground';
}

function getProgressColor(score: number): string {
  if (score >= 70) return 'bg-green-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-muted';
}

function getRecommendation(score: number): string {
  if (score >= 80) return 'Highly likely to move. Prioritize engagement immediately.';
  if (score >= 60) return 'Good candidate for active opportunities. Maintain regular contact.';
  if (score >= 40) return 'Passively open. Keep on radar for future roles.';
  if (score >= 20) return 'Currently stable. Nurture relationship long-term.';
  return 'Not actively looking. Focus on relationship building.';
}

export function MoveProbabilityCard({ candidateId, className }: MoveProbabilityCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { moveProbability, factors, updatedAt, isLoading, recalculate, isRecalculating } = useMoveProbability(candidateId);

  const factorBreakdown = factors as unknown as FactorBreakdown | null;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-400" />
            Move Probability
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => recalculate()}
            disabled={isRecalculating}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isRecalculating && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Score */}
        <div className="text-center">
          <span className={cn('text-5xl font-bold', getScoreColor(moveProbability))}>
            {moveProbability}
          </span>
          <span className="text-2xl text-muted-foreground">%</span>
        </div>

        {/* Progress Bar */}
        <div className="relative">
          <Progress value={moveProbability} className="h-2" />
          <div
            className={cn('absolute top-0 h-2 rounded-full transition-all', getProgressColor(moveProbability))}
            style={{ width: `${moveProbability}%` }}
          />
        </div>

        {/* Recommendation */}
        <p className="text-sm text-muted-foreground text-center">
          {getRecommendation(moveProbability)}
        </p>

        {/* Factor Breakdown */}
        {factorBreakdown && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span className="text-sm">Factor Breakdown</span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3">
              {Object.entries(factorBreakdown).map(([key, value]) => {
                const factorKey = key as keyof FactorBreakdown;
                const factorInfo = factorLabels[factorKey];
                const weight = factorWeights[factorKey];
                const contribution = (value as number) * weight;

                if (!factorInfo) return null;

                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1">
                        {factorInfo.label}
                        <span className="text-[10px]">({Math.round(weight * 100)}%)</span>
                      </span>
                      <span className="font-medium">{Math.round(value as number)}</span>
                    </div>
                    <Progress value={value as number} className="h-1.5" />
                  </div>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Last Updated */}
        {updatedAt && (
          <p className="text-xs text-muted-foreground text-center">
            Updated {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
