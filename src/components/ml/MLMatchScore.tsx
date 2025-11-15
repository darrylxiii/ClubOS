import { TrendingUp, Brain, Clock, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { ShapExplanation } from '@/types/ml';

interface MLMatchScoreProps {
  predictionScore: number;
  interviewProbability: number;
  predictedTimeToHire: number;
  shapValues: ShapExplanation[];
  modelVersion: number;
  className?: string;
}

export function MLMatchScore({
  predictionScore,
  interviewProbability,
  predictedTimeToHire,
  shapValues,
  modelVersion,
  className,
}: MLMatchScoreProps) {
  const scorePercentage = Math.round(predictionScore * 100);
  const interviewPercentage = Math.round(interviewProbability * 100);

  const getScoreColor = (score: number) => {
    if (score >= 0.75) return 'text-success';
    if (score >= 0.5) return 'text-warning';
    return 'text-muted-foreground';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 0.75) return { label: 'Excellent Match', variant: 'default' as const };
    if (score >= 0.5) return { label: 'Good Match', variant: 'secondary' as const };
    return { label: 'Fair Match', variant: 'outline' as const };
  };

  const badge = getScoreBadge(predictionScore);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            AI Match Analysis
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="text-xs">
                  v{modelVersion} {modelVersion === 0 ? '(Baseline)' : ''}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {modelVersion === 0 
                    ? 'Rule-based matching (baseline)' 
                    : `ML Model version ${modelVersion}`
                  }
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Match Score</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${getScoreColor(predictionScore)}`}>
                {scorePercentage}%
              </span>
              <Badge variant={badge.variant}>{badge.label}</Badge>
            </div>
          </div>
          <Progress value={scorePercentage} className="h-2" />
        </div>

        {/* Interview Probability */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              Interview Probability
            </div>
            <div className="text-lg font-semibold">{interviewPercentage}%</div>
            <Progress value={interviewPercentage} className="h-1" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Est. Time to Hire
            </div>
            <div className="text-lg font-semibold">{predictedTimeToHire} days</div>
            <div className="text-xs text-muted-foreground">
              {predictedTimeToHire < 30 ? 'Fast track' : predictedTimeToHire < 45 ? 'Normal' : 'Extended'}
            </div>
          </div>
        </div>

        {/* SHAP Explanations */}
        {shapValues && shapValues.length > 0 && (
          <div className="pt-2 border-t">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Why this match?
            </div>
            <div className="space-y-1.5">
              {shapValues.slice(0, 3).map((shap, index) => (
                <div key={index} className="flex items-start gap-2 text-xs">
                  <div className={`mt-0.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                    shap.impact_direction === 'positive' 
                      ? 'bg-success' 
                      : 'bg-destructive'
                  }`} />
                  <span className="text-foreground">{shap.human_readable}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Powered by */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Powered by QUIN AI Matching Engine
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
