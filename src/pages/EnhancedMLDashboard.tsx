import { Brain, TrendingUp, Users, Target, Zap, Database, Building2, AlertTriangle, CheckCircle, BarChart3, Briefcase } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/lib/notify';
import { useMLMatching } from '@/hooks/useMLMatching';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { useState } from 'react';
import { useMLDashboardData, useMLDashboardJobs } from '@/hooks/useMLDashboardData';

export default function EnhancedMLDashboard() {
  const [searchParams] = useSearchParams();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(searchParams.get('jobId'));
  const { toast } = useToast();
  const navigate = useNavigate();

  const { data: jobs = [] } = useMLDashboardJobs();
  const { data, isLoading: loading } = useMLDashboardData(selectedJobId);

  const models = data?.models ?? [];
  const abTests = data?.abTests ?? [];
  const metrics = data?.metrics ?? [];
  const companyIntelligence = data?.companyIntelligence ?? [];
  const recentInsights = data?.recentInsights ?? [];
  const interactionStats = data?.interactionStats ?? null;

  const activeModel = models.find(m => m.status === 'active');
  const runningTests = abTests.filter(t => t.status === 'running');

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            ML & Intelligence Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor ML performance and company intelligence across the platform
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedJobId || 'all'} onValueChange={(val) => setSelectedJobId(val === 'all' ? null : val)}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Filter by job" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Jobs</SelectItem>
              {jobs.map(job => (
                <SelectItem key={job.id} value={job.id}>
                  {job.title} - {job.companies?.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedJobId && (
            <Button onClick={() => navigate(`/jobs/${selectedJobId}/dashboard?tab=intelligence`)} variant="outline">
              <Briefcase className="h-4 w-4 mr-2" />
              View Job Dashboard
            </Button>
          )}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Model</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              v{activeModel?.version || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {activeModel?.model_type || 'Baseline'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Companies Tracked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {companyIntelligence.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              With intelligence data
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Interactions (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {interactionStats?.total || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {interactionStats?.companiesWithData || 0} companies
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Training Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeModel?.training_data_count?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Data points
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Model Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeModel?.metrics?.auc_roc
                ? (activeModel.metrics.auc_roc * 100).toFixed(1) + '%'
                : 'N/A'
              }
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              AUC-ROC Score
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="intelligence" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="intelligence">
            <Brain className="h-4 w-4 mr-2" />
            Company Intelligence
          </TabsTrigger>
          <TabsTrigger value="insights">
            <Zap className="h-4 w-4 mr-2" />
            Live Insights
          </TabsTrigger>
          <TabsTrigger value="coverage">
            <BarChart3 className="h-4 w-4 mr-2" />
            Data Coverage
          </TabsTrigger>
          <TabsTrigger value="models">
            <Target className="h-4 w-4 mr-2" />
            Model Performance
          </TabsTrigger>
          <TabsTrigger value="ab-tests">
            <TrendingUp className="h-4 w-4 mr-2" />
            A/B Tests
          </TabsTrigger>
        </TabsList>

        {/* Company Intelligence Leaderboard */}
        <TabsContent value="intelligence" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Company Intelligence Leaderboard</CardTitle>
              <CardDescription>
                Companies ranked by relationship health and engagement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {companyIntelligence.slice(0, 20).map((item: any, idx: number) => (
                  <div
                    key={item.company.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/companies/${item.company.slug}?tab=intelligence`)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-2xl font-bold text-muted-foreground w-8">
                        #{idx + 1}
                      </div>
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="font-medium">{item.company.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={
                            item.relationship_status === 'hot_lead' ? 'default' :
                            item.relationship_status === 'warm' ? 'secondary' :
                            'outline'
                          }>
                            {item.relationship_status.replace('_', ' ')}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {item.total_interactions} interactions
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-sm font-bold">{item.health_score}/100</div>
                        <div className="text-xs text-muted-foreground">Health</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold">{item.urgency_score.toFixed(1)}/10</div>
                        <div className="text-xs text-muted-foreground">Urgency</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-sm font-bold ${item.sentiment >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {item.sentiment >= 0 ? '+' : ''}{item.sentiment.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">Sentiment</div>
                      </div>
                    </div>
                  </div>
                ))}
                {companyIntelligence.length === 0 && (
                  <p className="text-center text-muted-foreground py-12">
                    No intelligence data yet. Generate reports for companies to see insights.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Real-time Insights Feed */}
        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Intelligence Signals</CardTitle>
              <CardDescription>
                Latest insights extracted from company interactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentInsights.map((insight: any) => (
                  <div
                    key={insight.id}
                    className="flex items-start gap-3 p-3 border rounded-lg"
                  >
                    {insight.insight_type === 'hiring_urgency' && <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />}
                    {insight.insight_type === 'positive_signal' && <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />}
                    {insight.insight_type === 'red_flag' && <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />}
                    {insight.insight_type === 'budget_signal' && <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5" />}

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{insight.insight_type.replace('_', ' ')}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {insight.interaction?.company?.name}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {insight.interaction?.interaction_date ?
                            format(new Date(insight.interaction.interaction_date), 'MMM d, yyyy') :
                            'N/A'}
                        </span>
                      </div>
                      <p className="text-sm">{insight.insight_text}</p>
                      {insight.confidence_score && (
                        <div className="mt-2">
                          <Progress value={insight.confidence_score * 100} className="h-1" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {recentInsights.length === 0 && (
                  <p className="text-center text-muted-foreground py-12">
                    No recent insights. Log interactions to generate intelligence.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Coverage */}
        <TabsContent value="coverage" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Interaction Coverage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Total Interactions (30d)</span>
                      <span className="font-bold">{interactionStats?.total || 0}</span>
                    </div>
                    <Progress value={Math.min(100, (interactionStats?.total || 0) / 10)} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Companies with Data</span>
                      <span className="font-bold">{interactionStats?.companiesWithData || 0}</span>
                    </div>
                    <Progress value={(interactionStats?.companiesWithData || 0) * 5} className="h-2" />
                  </div>
                  {interactionStats?.byType && Object.entries(interactionStats.byType).map(([type, count]: [string, any]) => (
                    <div key={type}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm capitalize">{type.replace('_', ' ')}</span>
                        <span className="font-bold">{count}</span>
                      </div>
                      <Progress value={(count / (interactionStats.total || 1)) * 100} className="h-1" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Intelligence Quality</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">AI Reports Generated</span>
                      <span className="font-bold">{companyIntelligence.length}</span>
                    </div>
                    <Progress value={(companyIntelligence.length / 20) * 100} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Insights Extracted</span>
                      <span className="font-bold">{recentInsights.length}</span>
                    </div>
                    <Progress value={(recentInsights.length / 50) * 100} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Average Health Score</span>
                      <span className="font-bold">
                        {companyIntelligence.length > 0 ?
                          (companyIntelligence.reduce((sum: number, c: any) => sum + c.health_score, 0) / companyIntelligence.length).toFixed(0) :
                          0}
                      </span>
                    </div>
                    <Progress
                      value={companyIntelligence.length > 0 ?
                        companyIntelligence.reduce((sum: number, c: any) => sum + c.health_score, 0) / companyIntelligence.length :
                        0}
                      className="h-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Model Performance */}
        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Model Registry</CardTitle>
              <CardDescription>
                All trained models and their performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading models...</div>
              ) : models.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No models trained yet. Using baseline rule-based matching.
                </div>
              ) : (
                <div className="space-y-4">
                  {models.map((model) => (
                    <div
                      key={model.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">Version {model.version}</h3>
                            {model.status === 'active' && (
                              <Badge variant="default">Active</Badge>
                            )}
                            <Badge variant="outline">{model.model_type}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {model.notes || 'No description'}
                          </p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          {new Date(model.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      {model.metrics && (
                        <div className="grid grid-cols-4 gap-4 pt-2 border-t">
                          {model.metrics.auc_roc && (
                            <div>
                              <div className="text-xs text-muted-foreground">AUC-ROC</div>
                              <div className="text-sm font-semibold">
                                {(model.metrics.auc_roc * 100).toFixed(1)}%
                              </div>
                            </div>
                          )}
                          {model.metrics.precision_at_10 && (
                            <div>
                              <div className="text-xs text-muted-foreground">Precision@10</div>
                              <div className="text-sm font-semibold">
                                {(model.metrics.precision_at_10 * 100).toFixed(1)}%
                              </div>
                            </div>
                          )}
                          {model.metrics.interview_rate && (
                            <div>
                              <div className="text-xs text-muted-foreground">Interview Rate</div>
                              <div className="text-sm font-semibold">
                                {(model.metrics.interview_rate * 100).toFixed(1)}%
                              </div>
                            </div>
                          )}
                          {model.metrics.hire_rate && (
                            <div>
                              <div className="text-xs text-muted-foreground">Hire Rate</div>
                              <div className="text-sm font-semibold">
                                {(model.metrics.hire_rate * 100).toFixed(1)}%
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* A/B Tests */}
        <TabsContent value="ab-tests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>A/B Tests</CardTitle>
              <CardDescription>
                Experiments comparing different model versions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading tests...</div>
              ) : abTests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No A/B tests running yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {abTests.map((test) => (
                    <div
                      key={test.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{test.test_name}</h3>
                            <Badge
                              variant={test.status === 'running' ? 'default' : 'secondary'}
                            >
                              {test.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            v{test.model_a_version} vs v{test.model_b_version}
                          </p>
                          {test.hypothesis && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {test.hypothesis}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span>Traffic Split</span>
                          <span>{Math.round(test.traffic_split * 100)}% / {Math.round((1 - test.traffic_split) * 100)}%</span>
                        </div>
                        <Progress value={test.traffic_split * 100} className="h-2" />
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2 border-t text-sm">
                        <div>
                          <div className="text-muted-foreground">Model A Samples</div>
                          <div className="font-semibold">{test.sample_size_a}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Model B Samples</div>
                          <div className="font-semibold">{test.sample_size_b}</div>
                        </div>
                      </div>

                      {test.winner && test.winner !== 'pending' && (
                        <div className="pt-2 border-t">
                          <Badge variant="default">
                            Winner: {test.winner === 'model_a' ? `v${test.model_a_version}` : `v${test.model_b_version}`}
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
