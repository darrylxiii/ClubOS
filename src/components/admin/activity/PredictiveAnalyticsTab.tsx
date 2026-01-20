import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Brain, Target, TrendingUp, AlertTriangle, Zap, 
  RefreshCw, Sparkles, Clock, Users, BarChart3,
  ArrowRight, CheckCircle2, XCircle
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { usePredictiveAnalytics, ChurnRiskUser, HiringPrediction } from '@/hooks/usePredictiveAnalytics';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function PredictiveAnalyticsTab() {
  const {
    activeModel,
    matchPredictions,
    churnRiskUsers,
    engagementStats,
    activeJobs,
    recommendations,
    isLoading,
    generatingPredictions,
    generateHiringPredictions,
    trainModel,
    refetchChurn,
    refetchModel,
  } = usePredictiveAnalytics();

  const [selectedJobPrediction, setSelectedJobPrediction] = useState<HiringPrediction | null>(null);
  const [trainingModel, setTrainingModel] = useState(false);

  const handleTrainModel = async () => {
    try {
      setTrainingModel(true);
      await trainModel();
      toast.success('Model training initiated');
    } catch (err) {
      toast.error('Failed to train model');
    } finally {
      setTrainingModel(false);
    }
  };

  const handleGeneratePredictions = async (jobId: string) => {
    const prediction = await generateHiringPredictions(jobId);
    if (prediction) {
      setSelectedJobPrediction(prediction);
      toast.success('Predictions generated');
    } else {
      toast.error('Failed to generate predictions');
    }
  };

  const getRiskBadgeVariant = (level: ChurnRiskUser['risk_level']) => {
    switch (level) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">ML Model Status</CardTitle>
            <Brain className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            {activeModel ? (
              <>
                <div className="text-2xl font-bold text-green-500">Active</div>
                <p className="text-xs text-muted-foreground mt-1">
                  v{activeModel.version} • {activeModel.model_type}
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-orange-500">No Model</div>
                <p className="text-xs text-muted-foreground mt-1">Train to enable predictions</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Match Predictions</CardTitle>
            <Target className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{matchPredictions?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Candidate matches scored</p>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Churn Risk</CardTitle>
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {churnRiskUsers?.filter(u => u.risk_level === 'critical' || u.risk_level === 'high').length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">High-risk users</p>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Engagement</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{engagementStats?.avgEventsPerUser || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Avg actions/user (7d)</p>
          </CardContent>
        </Card>
      </div>

      {/* ML Model Status Card */}
      <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              ML Engine Status
            </CardTitle>
            <CardDescription>Machine learning model for candidate matching</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetchModel()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button 
              size="sm" 
              onClick={handleTrainModel} 
              disabled={trainingModel}
            >
              {trainingModel ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Training...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Train Model
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {activeModel ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-3 rounded-lg bg-muted/20 border border-border/10">
                <p className="text-xs text-muted-foreground">Version</p>
                <p className="text-lg font-semibold">{activeModel.version}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/20 border border-border/10">
                <p className="text-xs text-muted-foreground">AUC-ROC</p>
                <p className="text-lg font-semibold">
                  {activeModel.metrics?.auc_roc ? `${(activeModel.metrics.auc_roc * 100).toFixed(1)}%` : 'N/A'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/20 border border-border/10">
                <p className="text-xs text-muted-foreground">Precision@10</p>
                <p className="text-lg font-semibold">
                  {activeModel.metrics?.precision_at_10 ? `${(activeModel.metrics.precision_at_10 * 100).toFixed(1)}%` : 'N/A'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/20 border border-border/10">
                <p className="text-xs text-muted-foreground">Training Samples</p>
                <p className="text-lg font-semibold">{activeModel.training_data_count || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/20 border border-border/10">
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-lg font-semibold">{format(new Date(activeModel.created_at), 'MMM d')}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 bg-muted/10 rounded-lg border border-dashed border-border/20">
              <Brain className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground mb-2">No active ML model</p>
              <p className="text-sm text-muted-foreground/70 mb-4">
                Train a model to enable AI-powered candidate matching predictions
              </p>
              <Button onClick={handleTrainModel} disabled={trainingModel}>
                <Sparkles className="w-4 h-4 mr-2" />
                Train First Model
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hiring Predictions */}
        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Hiring Predictions
            </CardTitle>
            <CardDescription>AI-generated predictions for active job postings</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {activeJobs?.map(job => (
                  <div 
                    key={job.id} 
                    className="p-4 rounded-lg bg-muted/20 border border-border/10 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium truncate flex-1">{job.title}</h4>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleGeneratePredictions(job.id)}
                        disabled={generatingPredictions}
                      >
                        {generatingPredictions ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-1" />
                            Predict
                          </>
                        )}
                      </Button>
                    </div>
                    {selectedJobPrediction?.jobId === job.id && selectedJobPrediction.predictions && (
                      <div className="mt-3 pt-3 border-t border-border/10 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Time to Hire</span>
                          <span className="font-medium">
                            {selectedJobPrediction.predictions.timeToHire?.predictedDays || 'N/A'} days
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Offer Acceptance</span>
                          <span className="font-medium">
                            {selectedJobPrediction.predictions.offerAcceptanceProbability?.averageProbability 
                              ? `${(selectedJobPrediction.predictions.offerAcceptanceProbability.averageProbability * 100).toFixed(0)}%`
                              : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Pipeline Health</span>
                          <span className="font-medium">
                            {selectedJobPrediction.predictions.pipelineHealth?.score || 'N/A'}/100
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {(!activeJobs || activeJobs.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No active jobs to predict
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Candidate Match Predictions */}
        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Top Match Predictions
            </CardTitle>
            <CardDescription>ML-scored candidate-job matches</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {matchPredictions?.slice(0, 10).map(prediction => (
                  <div 
                    key={prediction.id} 
                    className="p-3 rounded-lg bg-muted/20 border border-border/10"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{prediction.candidate_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{prediction.job_title}</p>
                      </div>
                      <div className="text-right ml-3">
                        <Badge 
                          variant={prediction.prediction_score >= 0.7 ? 'default' : 'secondary'}
                          className={cn(
                            prediction.prediction_score >= 0.8 && 'bg-green-500/20 text-green-600 border-green-500/30'
                          )}
                        >
                          {(prediction.prediction_score * 100).toFixed(0)}% match
                        </Badge>
                        {prediction.interview_probability && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {(prediction.interview_probability * 100).toFixed(0)}% interview
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {(!matchPredictions || matchPredictions.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>No match predictions yet</p>
                    <p className="text-xs mt-1">Train a model to generate predictions</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Churn Risk Analysis */}
      <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Churn Risk Analysis
            </CardTitle>
            <CardDescription>Users at risk of leaving based on activity patterns</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetchChurn()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {/* Risk Distribution */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {(['critical', 'high', 'medium', 'low'] as const).map(level => {
              const count = churnRiskUsers?.filter(u => u.risk_level === level).length || 0;
              const total = churnRiskUsers?.length || 1;
              const colors = {
                critical: 'text-red-500 bg-red-500/10',
                high: 'text-orange-500 bg-orange-500/10',
                medium: 'text-yellow-500 bg-yellow-500/10',
                low: 'text-green-500 bg-green-500/10',
              };
              return (
                <div key={level} className={cn('p-3 rounded-lg', colors[level])}>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs capitalize">{level} Risk</p>
                </div>
              );
            })}
          </div>

          <ScrollArea className="h-[350px]">
            <div className="space-y-3">
              {churnRiskUsers?.map(user => (
                <div 
                  key={user.id} 
                  className={cn(
                    'p-4 rounded-lg border',
                    user.risk_level === 'critical' && 'bg-red-500/5 border-red-500/20',
                    user.risk_level === 'high' && 'bg-orange-500/5 border-orange-500/20',
                    user.risk_level === 'medium' && 'bg-yellow-500/5 border-yellow-500/20',
                    user.risk_level === 'low' && 'bg-muted/20 border-border/10',
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{user.full_name}</span>
                        <Badge variant={getRiskBadgeVariant(user.risk_level)} className="capitalize">
                          {user.risk_level}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {user.role}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{user.email}</p>
                      
                      <div className="space-y-1 mt-2">
                        {user.reasons.map((reason, i) => (
                          <div key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                            <XCircle className="w-3 h-3 mt-0.5 text-red-400 flex-shrink-0" />
                            <span>{reason}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 p-2 rounded bg-primary/10 text-xs">
                        <span className="font-medium text-primary">Recommended:</span>{' '}
                        <span className="text-muted-foreground">{user.recommended_action}</span>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-sm font-semibold">{user.risk_score}%</div>
                      <div className="text-xs text-muted-foreground">
                        {user.days_inactive}d inactive
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {(!churnRiskUsers || churnRiskUsers.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-500" />
                  <p>No significant churn risks detected</p>
                  <p className="text-xs mt-1">All users show healthy engagement patterns</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Action Recommendations */}
      <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Recommendations
          </CardTitle>
          <CardDescription>Suggested actions based on predictive analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recommendations.map((rec, i) => (
              <div 
                key={i} 
                className={cn(
                  'p-4 rounded-lg border flex items-start gap-4',
                  rec.priority === 'high' && 'bg-red-500/5 border-red-500/20',
                  rec.priority === 'medium' && 'bg-orange-500/5 border-orange-500/20',
                  rec.priority === 'low' && 'bg-muted/20 border-border/10',
                )}
              >
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                  rec.priority === 'high' && 'bg-red-500/20',
                  rec.priority === 'medium' && 'bg-orange-500/20',
                  rec.priority === 'low' && 'bg-muted/30',
                )}>
                  {rec.priority === 'high' ? (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  ) : rec.priority === 'medium' ? (
                    <TrendingUp className="w-4 h-4 text-orange-500" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{rec.action}</span>
                    <Badge variant="outline" className="text-xs capitalize">{rec.priority}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{rec.impact}</p>
                  <Badge variant="secondary" className="mt-2 text-xs">{rec.category}</Badge>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Engagement Distribution */}
      <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Engagement Predictions
          </CardTitle>
          <CardDescription>User engagement distribution from session data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-green-500">High Engagement</span>
                  <span className="text-sm text-muted-foreground">{engagementStats?.highEngagement || 0} users</span>
                </div>
                <Progress 
                  value={engagementStats?.totalUsers ? (engagementStats.highEngagement / engagementStats.totalUsers) * 100 : 0} 
                  className="h-2 bg-muted/20"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-yellow-500">Medium Engagement</span>
                  <span className="text-sm text-muted-foreground">{engagementStats?.mediumEngagement || 0} users</span>
                </div>
                <Progress 
                  value={engagementStats?.totalUsers ? (engagementStats.mediumEngagement / engagementStats.totalUsers) * 100 : 0} 
                  className="h-2 bg-muted/20"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-red-500">Low Engagement</span>
                  <span className="text-sm text-muted-foreground">{engagementStats?.lowEngagement || 0} users</span>
                </div>
                <Progress 
                  value={engagementStats?.totalUsers ? (engagementStats.lowEngagement / engagementStats.totalUsers) * 100 : 0} 
                  className="h-2 bg-muted/20"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
