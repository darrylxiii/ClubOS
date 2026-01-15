import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertTriangle,
  Clock,
  Target,
  Sparkles,
  RefreshCw,
  ChevronRight
} from 'lucide-react';
import { useRelationshipPredictions } from '@/hooks/useRelationshipPredictions';
import { cn } from '@/lib/utils';

interface PredictiveInsightsCardProps {
  entityType: 'candidate' | 'company' | 'contact';
  entityId: string;
  entityName?: string;
}

export function PredictiveInsightsCard({ entityType, entityId, entityName }: PredictiveInsightsCardProps) {
  const { loading, prediction, getPrediction } = useRelationshipPredictions();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (entityId) {
      getPrediction(entityType, entityId);
    }
  }, [entityType, entityId, getPrediction]);

  const getTrajectoryIcon = (trajectory: string) => {
    switch (trajectory) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 70) return 'text-green-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  if (loading && !prediction) {
    return (
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2">
            <Brain className="h-5 w-5 animate-pulse text-primary" />
            <span className="text-muted-foreground">Analyzing relationship...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!prediction) {
    return (
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No prediction data available</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => getPrediction(entityType, entityId)}
            >
              Generate Prediction
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { predictions, optimalTiming, recommendations, metrics } = prediction;

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Predictions
            {entityName && <span className="text-muted-foreground font-normal">for {entityName}</span>}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => getPrediction(entityType, entityId)}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Scores */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className={cn("text-2xl font-bold", getHealthColor(predictions.health_score))}>
              {predictions.health_score}%
            </div>
            <div className="text-xs text-muted-foreground">Health Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">
              {predictions.conversion_probability}%
            </div>
            <div className="text-xs text-muted-foreground">Conversion</div>
          </div>
          <div className="text-center">
            <div className={cn(
              "text-2xl font-bold",
              predictions.churn_risk > 50 ? "text-red-500" : predictions.churn_risk > 25 ? "text-yellow-500" : "text-green-500"
            )}>
              {predictions.churn_risk}%
            </div>
            <div className="text-xs text-muted-foreground">Churn Risk</div>
          </div>
        </div>

        {/* Trajectory & Confidence */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
          <div className="flex items-center gap-2">
            {getTrajectoryIcon(predictions.trajectory)}
            <span className="text-sm capitalize">{predictions.trajectory} trajectory</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm">{predictions.confidence}% confidence</span>
          </div>
        </div>

        {/* Optimal Timing */}
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Best Time to Reach Out</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {optimalTiming.best_time_formatted}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Recommended frequency: every {optimalTiming.recommended_frequency_days} days
          </p>
        </div>

        {/* Time to Conversion */}
        {predictions.conversion_probability > 30 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <Target className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm font-medium text-green-400">Estimated Conversion</p>
              <p className="text-xs text-muted-foreground">
                ~{predictions.time_to_conversion_days} days with consistent engagement
              </p>
            </div>
          </div>
        )}

        {/* Churn Warning */}
        {predictions.churn_risk > 50 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-sm font-medium text-red-400">High Churn Risk</p>
              <p className="text-xs text-muted-foreground">
                Take action within 48 hours to re-engage
              </p>
            </div>
          </div>
        )}

        {/* Recommendations */}
        <div>
          <Button
            variant="ghost"
            className="w-full justify-between p-0 h-auto hover:bg-transparent"
            onClick={() => setExpanded(!expanded)}
          >
            <span className="text-sm font-medium">AI Recommendations ({recommendations.length})</span>
            <ChevronRight className={cn("h-4 w-4 transition-transform", expanded && "rotate-90")} />
          </Button>
          
          {expanded && (
            <div className="mt-3 space-y-2">
              {recommendations.map((rec, index) => (
                <div 
                  key={index}
                  className="p-3 rounded-lg bg-muted/30 border border-border/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={getPriorityColor(rec.priority)}>
                          {rec.priority}
                        </Badge>
                        <span className="text-xs text-green-400">{rec.impact}</span>
                      </div>
                      <p className="text-sm font-medium">{rec.action}</p>
                      <p className="text-xs text-muted-foreground mt-1">{rec.reason}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
          <div className="text-center p-2">
            <div className="text-lg font-semibold">{metrics.response_rate}%</div>
            <div className="text-xs text-muted-foreground">Response Rate</div>
          </div>
          <div className="text-center p-2">
            <div className="text-lg font-semibold">{metrics.avg_response_time_hours}h</div>
            <div className="text-xs text-muted-foreground">Avg Response</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
