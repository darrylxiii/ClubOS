import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Calendar, DollarSign, Target, AlertCircle, Loader2, Sparkles, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface PredictiveAnalyticsDashboardProps {
  jobId: string;
}

export function PredictiveAnalyticsDashboard({ jobId }: PredictiveAnalyticsDashboardProps) {
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState<any>(null);

  const loadPredictions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('predict-hiring-outcomes', {
        body: { jobId }
      });

      if (error) throw error;
      setPredictions(data.predictions);
      toast.success("Predictive analytics generated");
    } catch (error: any) {
      console.error('Error loading predictions:', error);
      toast.error("Failed to generate predictions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPredictions();
  }, [jobId]);

  if (loading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <CardContent className="pt-6 flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground">Generating predictive analytics...</p>
        </CardContent>
      </Card>
    );
  }

  if (!predictions) {
    return (
      <Card className="border-border/50">
        <CardContent className="pt-6">
          <Button onClick={loadPredictions} className="w-full">
            <BarChart3 className="h-4 w-4 mr-2" />
            Generate Predictive Analytics
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getDifficultyColor = (score: string) => {
    switch (score) {
      case 'easy': return 'text-green-500';
      case 'hard':
      case 'very hard': return 'text-red-500';
      default: return 'text-yellow-500';
    }
  };

  return (
    <div className="space-y-4">
      {/* Time to Hire Prediction */}
      <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Time-to-Hire Forecast
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold">{predictions.timeToHire.predictedDays} days</p>
              <p className="text-sm text-muted-foreground">
                {Math.round(predictions.timeToHire.confidence * 100)}% confidence
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">Expected range</p>
              <p className="text-sm font-medium">
                {predictions.timeToHire.earliestDate} - {predictions.timeToHire.latestDate}
              </p>
            </div>
          </div>
          <Progress value={predictions.timeToHire.confidence * 100} className="h-2" />
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Key Factors:</p>
            <div className="flex flex-wrap gap-2">
              {predictions.timeToHire.factors.map((factor: string, idx: number) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {factor}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Offer Acceptance Prediction */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            Offer Acceptance Probability
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Average (All Candidates)</p>
              <div className="flex items-center gap-2">
                <Progress value={predictions.offerAcceptanceProbability.averageProbability * 100} className="flex-1 h-2" />
                <span className="text-sm font-semibold">
                  {Math.round(predictions.offerAcceptanceProbability.averageProbability * 100)}%
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Top Candidate</p>
              <div className="flex items-center gap-2">
                <Progress value={predictions.offerAcceptanceProbability.topCandidate.probability * 100} className="flex-1 h-2" />
                <span className="text-sm font-semibold">
                  {Math.round(predictions.offerAcceptanceProbability.topCandidate.probability * 100)}%
                </span>
              </div>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted/30">
            <p className="text-xs text-muted-foreground mb-1">Why</p>
            <p className="text-sm">{predictions.offerAcceptanceProbability.topCandidate.reasoning}</p>
          </div>
        </CardContent>
      </Card>

      {/* Hiring Difficulty */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Hiring Difficulty Assessment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Difficulty Level</span>
            <Badge variant="outline" className={getDifficultyColor(predictions.hiringDifficulty.score)}>
              {predictions.hiringDifficulty.score.toUpperCase()}
            </Badge>
          </div>
          <p className="text-sm">{predictions.hiringDifficulty.reasoning}</p>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Market Factors:</p>
            <div className="flex flex-wrap gap-2">
              {predictions.hiringDifficulty.marketFactors.map((factor: string, idx: number) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {factor}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Health */}
      <Card className={predictions.pipelineHealth.score < 60 ? "border-yellow-500/20 bg-yellow-500/5" : ""}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Pipeline Health Score
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">{predictions.pipelineHealth.score}/100</span>
            <Badge variant={predictions.pipelineHealth.score >= 70 ? "default" : "secondary"}>
              {predictions.pipelineHealth.score >= 70 ? "HEALTHY" : "NEEDS ATTENTION"}
            </Badge>
          </div>
          <Progress value={predictions.pipelineHealth.score} className="h-2" />
          
          {predictions.pipelineHealth.bottlenecks && predictions.pipelineHealth.bottlenecks.length > 0 && (
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-xs font-medium text-yellow-500 mb-2">Bottlenecks Detected</p>
              <ul className="space-y-1">
                {predictions.pipelineHealth.bottlenecks.map((bottleneck: string, idx: number) => (
                  <li key={idx} className="text-xs">• {bottleneck}</li>
                ))}
              </ul>
            </div>
          )}

          {predictions.pipelineHealth.recommendations && predictions.pipelineHealth.recommendations.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Recommendations:</p>
              <ul className="space-y-1">
                {predictions.pipelineHealth.recommendations.map((rec: string, idx: number) => (
                  <li key={idx} className="text-xs flex items-start gap-2">
                    <span className="text-primary mt-0.5">→</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cost Prediction */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Cost & Time Investment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Est. Cost per Hire</p>
              <p className="text-xl font-bold">€{predictions.costPrediction.estimatedCostPerHire.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Time Investment</p>
              <p className="text-xl font-bold">{predictions.costPrediction.timeInvestment}</p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted/30">
            <p className="text-xs font-medium mb-2">Cost Breakdown</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span>Recruiting</span>
                <span>€{predictions.costPrediction.breakdown.recruiting}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>Interviews</span>
                <span>€{predictions.costPrediction.breakdown.interviews}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>Administrative</span>
                <span>€{predictions.costPrediction.breakdown.administrative}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quality Prediction */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quality of Hire Forecast</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground mb-1">Expected Quality</p>
              <Badge variant="default">{predictions.qualityPrediction.expectedQuality.toUpperCase()}</Badge>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground mb-1">Retention</p>
              <p className="text-sm font-semibold">{Math.round(predictions.qualityPrediction.retentionProbability * 100)}%</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground mb-1">Time to Productivity</p>
              <Badge variant="outline">{predictions.qualityPrediction.timeToProductivity}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Competitive Intelligence */}
      <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <CardHeader>
          <CardTitle className="text-base">Market Intelligence</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Market Demand</p>
              <Badge variant="outline">{predictions.competitiveIntel.marketDemand.toUpperCase()}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Salary Benchmark</p>
              <p className="text-sm font-medium">{predictions.competitiveIntel.salaryBenchmark}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Competing Offers</p>
              <p className="text-sm font-medium">{predictions.competitiveIntel.competingOffers}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Action Timing</p>
              <p className="text-sm font-medium">{predictions.competitiveIntel.speedToOffer}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Recommendations */}
      {predictions.actionRecommendations && predictions.actionRecommendations.length > 0 && (
        <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI-Recommended Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {predictions.actionRecommendations.map((action: any, idx: number) => (
                <div key={idx} className="p-3 rounded-lg bg-background/60 border border-border/40">
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant={action.priority === 'high' ? 'default' : 'secondary'}>
                      {action.priority.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {action.timeline}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium mb-1">{action.action}</p>
                  <p className="text-xs text-muted-foreground">Expected: {action.impact}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Button onClick={loadPredictions} variant="outline" className="w-full" size="sm">
        <Sparkles className="h-4 w-4 mr-2" />
        Refresh Predictions
      </Button>
    </div>
  );
}
