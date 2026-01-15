import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Calendar, DollarSign, Target, AlertCircle, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface CostPrediction {
  estimatedCostPerHire: number | null;
  timeInvestment: string | null;
  breakdown: {
    recruiting: number;
    interviews: number;
    administrative: number;
  };
}

interface QualityPrediction {
  expectedQuality: string | null;
  retentionProbability: number | null;
  timeToProductivity: string | null;
}

interface CompetitiveIntel {
  marketDemand: string | null;
  salaryBenchmark: string | null;
  competingOffers: string | null;
  speedToOffer: string | null;
}

interface Predictions {
  timeToHire?: any;
  offerAcceptanceProbability?: any;
  hiringDifficulty?: any;
  pipelineHealth?: any;
  costPrediction?: CostPrediction | null;
  qualityPrediction?: QualityPrediction | null;
  competitiveIntel?: CompetitiveIntel | null;
  actionRecommendations?: any[];
  skipped?: boolean;
}

interface PredictiveAnalyticsDashboardProps {
  jobId: string;
}

export function PredictiveAnalyticsDashboard({ jobId }: PredictiveAnalyticsDashboardProps) {
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState<Predictions | null>(null);

  const loadPredictions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('predict-hiring-outcomes', {
        body: { jobId }
      });

      if (error) throw error;
      
      if (data?.predictions) {
        // Normalize data with defensive defaults
        const normalizedPredictions: Predictions = {
          ...data.predictions,
          costPrediction: data.predictions.costPrediction ? {
            estimatedCostPerHire: data.predictions.costPrediction.estimatedCostPerHire ?? null,
            timeInvestment: data.predictions.costPrediction.timeInvestment ?? null,
            breakdown: {
              recruiting: data.predictions.costPrediction.breakdown?.recruiting ?? 0,
              interviews: data.predictions.costPrediction.breakdown?.interviews ?? 0,
              administrative: data.predictions.costPrediction.breakdown?.administrative ?? 0,
            }
          } : null,
          qualityPrediction: data.predictions.qualityPrediction ? {
            expectedQuality: data.predictions.qualityPrediction.expectedQuality ?? null,
            retentionProbability: data.predictions.qualityPrediction.retentionProbability ?? null,
            timeToProductivity: data.predictions.qualityPrediction.timeToProductivity ?? null,
          } : null,
          competitiveIntel: data.predictions.competitiveIntel ? {
            marketDemand: data.predictions.competitiveIntel.marketDemand ?? null,
            salaryBenchmark: data.predictions.competitiveIntel.salaryBenchmark ?? null,
            competingOffers: data.predictions.competitiveIntel.competingOffers ?? null,
            speedToOffer: data.predictions.competitiveIntel.speedToOffer ?? null,
          } : null,
        };
        
        setPredictions(normalizedPredictions);
        toast.success("Predictive analytics generated");
      } else {
        throw new Error('No predictions returned from AI');
      }
    } catch (error: any) {
      console.error('Error loading predictions:', error);
      setPredictions(null);
      toast.error("Failed to generate predictions. You can retry or continue without AI insights.");
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
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="h-5 w-5 text-destructive" />
            AI Predictions Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Unable to generate predictive analytics. The dashboard will continue to work with standard metrics.
          </p>
          <div className="flex gap-2">
            <Button onClick={loadPredictions} variant="default" size="sm">
              <Sparkles className="h-4 w-4 mr-2" />
              Retry AI Analysis
            </Button>
            <Button onClick={() => setPredictions({ skipped: true })} variant="outline" size="sm">
              Continue Without AI
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If user skipped AI, don't show predictions
  if (predictions?.skipped) {
    return null;
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
      {predictions?.timeToHire && (
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
                <p className="text-3xl font-bold">{predictions.timeToHire.predictedDays ?? 'N/A'} days</p>
                <p className="text-sm text-muted-foreground">
                  {Math.round((predictions.timeToHire.confidence ?? 0) * 100)}% confidence
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-1">Expected range</p>
                <p className="text-sm font-medium">
                  {predictions.timeToHire.earliestDate ?? 'TBD'} - {predictions.timeToHire.latestDate ?? 'TBD'}
                </p>
              </div>
            </div>
            <Progress value={(predictions.timeToHire.confidence ?? 0) * 100} className="h-2" />
            {predictions.timeToHire.factors && predictions.timeToHire.factors.length > 0 && (
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
            )}
          </CardContent>
        </Card>
      )}

      {/* Offer Acceptance Prediction */}
      {predictions?.offerAcceptanceProbability && (
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
                  <Progress value={(predictions.offerAcceptanceProbability.averageProbability ?? 0) * 100} className="flex-1 h-2" />
                  <span className="text-sm font-semibold">
                    {Math.round((predictions.offerAcceptanceProbability.averageProbability ?? 0) * 100)}%
                  </span>
                </div>
              </div>
              {predictions.offerAcceptanceProbability.topCandidate?.probability && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Top Candidate</p>
                  <div className="flex items-center gap-2">
                    <Progress value={predictions.offerAcceptanceProbability.topCandidate.probability * 100} className="flex-1 h-2" />
                    <span className="text-sm font-semibold">
                      {Math.round(predictions.offerAcceptanceProbability.topCandidate.probability * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
            {predictions.offerAcceptanceProbability.topCandidate?.reasoning && (
              <div className="p-3 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">Why</p>
                <p className="text-sm">{predictions.offerAcceptanceProbability.topCandidate.reasoning}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Hiring Difficulty */}
      {predictions?.hiringDifficulty && (
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
              <Badge variant="outline" className={getDifficultyColor(predictions.hiringDifficulty.score ?? 'medium')}>
                {(predictions.hiringDifficulty.score ?? 'medium').toUpperCase()}
              </Badge>
            </div>
            {predictions.hiringDifficulty.reasoning && (
              <p className="text-sm">{predictions.hiringDifficulty.reasoning}</p>
            )}
            {predictions.hiringDifficulty.marketFactors && predictions.hiringDifficulty.marketFactors.length > 0 && (
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
            )}
          </CardContent>
        </Card>
      )}

      {/* Pipeline Health */}
      {predictions?.pipelineHealth && (
        <Card className={(predictions.pipelineHealth.score ?? 0) < 60 ? "border-yellow-500/20 bg-yellow-500/5" : ""}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Pipeline Health Score
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{predictions.pipelineHealth.score ?? 0}/100</span>
              <Badge variant={(predictions.pipelineHealth.score ?? 0) >= 70 ? "default" : "secondary"}>
                {(predictions.pipelineHealth.score ?? 0) >= 70 ? "HEALTHY" : "NEEDS ATTENTION"}
              </Badge>
            </div>
            <Progress value={predictions.pipelineHealth.score ?? 0} className="h-2" />
            
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
      )}

      {/* Cost Prediction */}
      {predictions?.costPrediction && (
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
                <p className="text-xl font-bold">€{predictions.costPrediction?.estimatedCostPerHire?.toLocaleString() ?? 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Time Investment</p>
                <p className="text-xl font-bold">{predictions.costPrediction?.timeInvestment ?? 'N/A'}</p>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs font-medium mb-2">Cost Breakdown</p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span>Recruiting</span>
                  <span>€{predictions.costPrediction?.breakdown?.recruiting ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>Interviews</span>
                  <span>€{predictions.costPrediction?.breakdown?.interviews ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>Administrative</span>
                  <span>€{predictions.costPrediction?.breakdown?.administrative ?? 0}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quality Prediction */}
      {predictions?.qualityPrediction && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quality of Hire Forecast</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <p className="text-xs text-muted-foreground mb-1">Expected Quality</p>
                <Badge variant="default">{predictions.qualityPrediction?.expectedQuality?.toUpperCase() ?? 'N/A'}</Badge>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <p className="text-xs text-muted-foreground mb-1">Retention</p>
                <p className="text-sm font-semibold">{Math.round((predictions.qualityPrediction?.retentionProbability ?? 0) * 100)}%</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <p className="text-xs text-muted-foreground mb-1">Time to Productivity</p>
                <Badge variant="outline">{predictions.qualityPrediction?.timeToProductivity ?? 'N/A'}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Competitive Intelligence */}
      {predictions?.competitiveIntel && (
        <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Market Intelligence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Market Demand</p>
                <Badge variant="outline">{predictions.competitiveIntel?.marketDemand?.toUpperCase() ?? 'N/A'}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Salary Benchmark</p>
                <p className="text-sm font-medium">{predictions.competitiveIntel?.salaryBenchmark ?? 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Competing Offers</p>
                <p className="text-sm font-medium">{predictions.competitiveIntel?.competingOffers ?? 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Action Timing</p>
                <p className="text-sm font-medium">{predictions.competitiveIntel?.speedToOffer ?? 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
