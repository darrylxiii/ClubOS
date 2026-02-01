import { memo, useState, Suspense, lazy } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Brain, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw, 
  AlertTriangle, 
  TrendingUp,
  Target,
  Lightbulb,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAggregatedHiringIntelligence, useRefreshAggregatedIntelligence } from '@/hooks/useAggregatedHiringIntelligence';

interface JobsAIInsightsWidgetProps {
  companyId?: string;
}

const HealthScoreCircle = memo(({ score, trend }: { score: number; trend: string }) => {
  const circumference = 2 * Math.PI * 36;
  const progress = (score / 100) * circumference;
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-primary';
    if (score >= 60) return 'text-amber-500';
    return 'text-destructive';
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'bg-primary/10 text-primary';
      case 'stable': return 'bg-muted text-muted-foreground';
      case 'declining': return 'bg-amber-500/10 text-amber-500';
      case 'needs_attention': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width="88" height="88" viewBox="0 0 88 88">
          <circle
            cx="44"
            cy="44"
            r="36"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="6"
          />
          <circle
            cx="44"
            cy="44"
            r="36"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            transform="rotate(-90 44 44)"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('text-2xl font-bold', getScoreColor(score))}>{score}</span>
          <span className="text-[10px] text-muted-foreground">/ 100</span>
        </div>
      </div>
      <Badge variant="outline" className={cn('text-xs', getTrendColor(trend))}>
        {trend.replace('_', ' ')}
      </Badge>
    </div>
  );
});

HealthScoreCircle.displayName = 'HealthScoreCircle';

const RecommendationCard = memo(({ 
  priority, 
  insight, 
  impact 
}: { 
  priority: 'critical' | 'high' | 'medium'; 
  insight: string; 
  impact: string;
}) => {
  const getPriorityStyles = () => {
    switch (priority) {
      case 'critical': return 'border-l-destructive bg-destructive/5';
      case 'high': return 'border-l-amber-500 bg-amber-500/5';
      case 'medium': return 'border-l-primary bg-primary/5';
      default: return 'border-l-muted bg-muted/5';
    }
  };

  return (
    <div className={cn('p-3 rounded-lg border-l-4 border border-border/20', getPriorityStyles())}>
      <div className="flex items-start gap-2">
        <Lightbulb className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{insight}</p>
          <p className="text-xs text-muted-foreground mt-1">{impact}</p>
        </div>
        <Badge variant="outline" className="shrink-0 text-[10px] capitalize">
          {priority}
        </Badge>
      </div>
    </div>
  );
});

RecommendationCard.displayName = 'RecommendationCard';

const ForecastCard = memo(({ 
  label, 
  value, 
  confidence 
}: { 
  label: string; 
  value: number; 
  confidence: number;
}) => (
  <div className="text-center p-2 rounded-lg bg-card/30 border border-border/20">
    <div className="text-lg font-bold text-foreground">{value}</div>
    <div className="text-[10px] text-muted-foreground">{label}</div>
    <div className="text-[10px] text-muted-foreground/70">{confidence}% conf.</div>
  </div>
));

ForecastCard.displayName = 'ForecastCard';

const LoadingSkeleton = () => (
  <div className="space-y-4 p-4">
    <div className="flex items-center gap-4">
      <Skeleton className="h-20 w-20 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
    <div className="grid grid-cols-3 gap-2">
      <Skeleton className="h-16" />
      <Skeleton className="h-16" />
      <Skeleton className="h-16" />
    </div>
  </div>
);

export const JobsAIInsightsWidget = memo(({ companyId }: JobsAIInsightsWidgetProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const { data: insights, isLoading, error } = useAggregatedHiringIntelligence(companyId);
  const refreshMutation = useRefreshAggregatedIntelligence();

  if (error) {
    return null; // Silently fail if no insights available
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-card/10 backdrop-blur-xl border-border/20">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-card/20 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Brain className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-base">QUIN Insights</CardTitle>
                <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/30">
                  <Sparkles className="h-2.5 w-2.5 mr-1" />
                  AI
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    refreshMutation.mutate(companyId);
                  }}
                  disabled={refreshMutation.isPending}
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', refreshMutation.isPending && 'animate-spin')} />
                </Button>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {isLoading ? (
              <LoadingSkeleton />
            ) : insights ? (
              <div className="space-y-4">
                {/* Health Score + Summary Row */}
                <div className="flex items-start gap-4">
                  <HealthScoreCircle 
                    score={insights.overallHealth.score} 
                    trend={insights.overallHealth.trend} 
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">
                      {insights.overallHealth.summary}
                    </p>
                    {insights.crossPipelineInsights.concernAreas.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-500">
                        <AlertTriangle className="h-3 w-3" />
                        <span>{insights.crossPipelineInsights.concernAreas[0]}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Forecast Row */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                    <Target className="h-3 w-3" />
                    <span>Hiring Forecast</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <ForecastCard 
                      label="30 days" 
                      value={insights.portfolioForecast.predictedHires30Days} 
                      confidence={insights.portfolioForecast.confidence}
                    />
                    <ForecastCard 
                      label="60 days" 
                      value={Math.round(insights.portfolioForecast.predictedHires30Days * 1.8)} 
                      confidence={Math.round(insights.portfolioForecast.confidence * 0.9)}
                    />
                    <ForecastCard 
                      label="90 days" 
                      value={insights.portfolioForecast.predictedHires90Days} 
                      confidence={Math.round(insights.portfolioForecast.confidence * 0.8)}
                    />
                  </div>
                </div>

                {/* Top Recommendations */}
                {insights.strategicRecommendations.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                      <TrendingUp className="h-3 w-3" />
                      <span>Strategic Recommendations</span>
                    </div>
                    <div className="space-y-2">
                      {insights.strategicRecommendations.slice(0, 3).map((rec, idx) => (
                        <RecommendationCard 
                          key={idx}
                          priority={rec.priority}
                          insight={rec.insight}
                          impact={rec.impact}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-border/20">
                  <span className="text-[10px] text-muted-foreground">Powered by QUIN</span>
                  <div className="text-[10px] text-muted-foreground">
                    {insights.metrics.totalActiveJobs} active jobs • {insights.metrics.totalApplications} candidates
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No insights available yet</p>
                <p className="text-xs">Add more jobs to generate AI predictions</p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
});

JobsAIInsightsWidget.displayName = 'JobsAIInsightsWidget';
