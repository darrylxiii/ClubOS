import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, TrendingUp, TrendingDown, Minus, AlertTriangle, Lightbulb, Target, BarChart3, RefreshCw, Loader2 } from "lucide-react";
import type { AggregatedHiringInsights } from "@/types/analytics";

interface AggregatedIntelligenceOverviewProps {
  insights: AggregatedHiringInsights | null;
  isLoading: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function AggregatedIntelligenceOverview({ 
  insights, 
  isLoading, 
  onRefresh,
  isRefreshing 
}: AggregatedIntelligenceOverviewProps) {
  if (isLoading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <CardContent className="pt-6 flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground">Generating cross-pipeline intelligence...</p>
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Intelligence Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Unable to generate aggregated insights. Try refreshing.
          </p>
          <Button onClick={onRefresh} disabled={isRefreshing}>
            {isRefreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Retry Analysis
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 70) return 'text-green-500';
    if (score >= 50) return 'text-amber-500';
    return 'text-red-500';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'high': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      default: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Executive Summary
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isRefreshing}>
              {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-4xl font-bold ${getHealthColor(insights.overallHealth.score)}`}>
                  {insights.overallHealth.score}
                </span>
                <span className="text-xl text-muted-foreground">/100</span>
                {getTrendIcon(insights.overallHealth.trend)}
              </div>
              <p className="text-sm text-muted-foreground">Overall Hiring Health</p>
            </div>
            <div className="text-right space-y-1">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-2xl font-bold">{insights.portfolioForecast.predictedHires30Days}</p>
                  <p className="text-xs text-muted-foreground">30-day forecast</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{insights.portfolioForecast.predictedHires90Days}</p>
                  <p className="text-xs text-muted-foreground">90-day forecast</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {Math.round(insights.portfolioForecast.confidence * 100)}% confidence
              </p>
            </div>
          </div>
          <p className="text-sm">{insights.overallHealth.summary}</p>
        </CardContent>
      </Card>

      {/* Strategic Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            Strategic Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.strategicRecommendations.map((rec, idx) => (
            <div 
              key={idx} 
              className={`p-3 rounded-lg border ${getPriorityColor(rec.priority)}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={getPriorityColor(rec.priority)}>
                      {rec.priority.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium">{rec.insight}</p>
                  <p className="text-xs text-muted-foreground mt-1">Impact: {rec.impact}</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Cross-Pipeline Intelligence */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5" />
            Cross-Pipeline Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bottleneck Pattern */}
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <p className="text-xs font-medium text-amber-600 mb-1">Bottleneck Pattern</p>
              <p className="text-sm">{insights.crossPipelineInsights.bottleneckPattern}</p>
            </div>

            {/* Top Performer */}
            {insights.crossPipelineInsights.topPerformer && (
              <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                <p className="text-xs font-medium text-green-600 mb-1">Top Performer</p>
                <p className="text-sm">{insights.crossPipelineInsights.topPerformer}</p>
              </div>
            )}
          </div>

          {/* Patterns */}
          {insights.crossPipelineInsights.patterns.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Detected Patterns</p>
              <div className="flex flex-wrap gap-2">
                {insights.crossPipelineInsights.patterns.map((pattern, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {pattern}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Concerns */}
          {insights.crossPipelineInsights.concernAreas.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Areas of Concern</p>
              {insights.crossPipelineInsights.concernAreas.map((concern, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <span>{concern}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Improvement Opportunities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-5 w-5" />
            Improvement Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.improvementOpportunities.map((opp, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-muted/30 border">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{opp.area}</p>
                    <p className="text-xs text-muted-foreground mt-1">Current: {opp.currentState}</p>
                    <p className="text-xs mt-1">{opp.recommendation}</p>
                  </div>
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                    {opp.potentialGain}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Portfolio Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Portfolio Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <p className="text-2xl font-bold">{insights.metrics.totalActiveJobs}</p>
              <p className="text-xs text-muted-foreground">Active Jobs</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <p className="text-2xl font-bold">{insights.metrics.totalApplications}</p>
              <p className="text-xs text-muted-foreground">Total Candidates</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <p className="text-2xl font-bold">{insights.metrics.totalInterviews}</p>
              <p className="text-xs text-muted-foreground">Scheduled Interviews</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <p className="text-2xl font-bold">{insights.metrics.avgMatchScore}%</p>
              <p className="text-xs text-muted-foreground">Avg Match Score</p>
            </div>
          </div>

          {/* Stage Distribution */}
          {insights.metrics.stageDistribution && Object.keys(insights.metrics.stageDistribution).length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Stage Distribution</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(insights.metrics.stageDistribution).map(([stage, count]) => (
                  <Badge key={stage} variant="outline">
                    {stage}: {count as number}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Pipeline Type Breakdown */}
          <div className="mt-4 flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-xs">{insights.metrics.standardPipelines} Standard</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-xs">{insights.metrics.continuousPipelines} Continuous</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
