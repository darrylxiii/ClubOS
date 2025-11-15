import { useState, useEffect } from 'react';
import { Brain, TrendingUp, Users, Target, Zap, Database, Building2, AlertTriangle, CheckCircle, BarChart3 } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMLMatching } from '@/hooks/useMLMatching';
import { useNavigate } from 'react-router-dom';
import type { MLModel, MLABTest, MLModelMetrics } from '@/types/ml';
import { format } from 'date-fns';

export default function EnhancedMLDashboard() {
  const [models, setModels] = useState<MLModel[]>([]);
  const [abTests, setABTests] = useState<MLABTest[]>([]);
  const [metrics, setMetrics] = useState<MLModelMetrics[]>([]);
  const [companyIntelligence, setCompanyIntelligence] = useState<any[]>([]);
  const [recentInsights, setRecentInsights] = useState<any[]>([]);
  const [interactionStats, setInteractionStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { backfillTrainingData, loading: backfillLoading } = useMLMatching();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [modelsResult, abTestsResult, metricsResult] = await Promise.all([
        (supabase as any).from('ml_models').select('*').order('version', { ascending: false }),
        (supabase as any).from('ml_ab_tests').select('*').order('started_at', { ascending: false }).limit(5),
        (supabase as any).from('ml_model_metrics').select('*').order('metric_date', { ascending: false }).limit(100),
      ]);

      if (modelsResult.data) setModels(modelsResult.data);
      if (abTestsResult.data) setABTests(abTestsResult.data);
      if (metricsResult.data) setMetrics(metricsResult.data);

      // Load intelligence data
      await loadIntelligenceData();
    } catch (error) {
      console.error('Error loading ML data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load ML dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadIntelligenceData = async () => {
    try {
      // Load cached intelligence reports for all companies
      const { data: reports } = await supabase
        .from('interaction_ml_features')
        .select(`
          *,
          company:companies(id, name, slug)
        `)
        .eq('entity_type', 'company')
        .order('computed_at', { ascending: false });

      if (reports) {
        const intelligenceData = reports
          .filter((r: any) => r.features?.ai_recommendations)
          .map((r: any) => ({
            company: r.company,
            health_score: r.features.ai_recommendations.overall_health_score || 0,
            relationship_status: r.features.ai_recommendations.relationship_status || 'unknown',
            total_interactions: r.features.interaction_summary?.total || 0,
            urgency_score: r.features.hiring_intelligence?.avg_urgency_score || 0,
            sentiment: r.features.interaction_summary?.avg_sentiment || 0,
            last_updated: r.computed_at,
            ghost_risk: r.features.ai_recommendations.ghost_risk || 0,
          }))
          .sort((a: any, b: any) => b.health_score - a.health_score);

        setCompanyIntelligence(intelligenceData);
      }

      // Load recent insights
      const { data: insights } = await supabase
        .from('interaction_insights')
        .select(`
          *,
          interaction:company_interactions(
            company:companies(name, slug),
            interaction_type,
            interaction_date
          )
        `)
        .in('insight_type', ['hiring_urgency', 'positive_signal', 'red_flag', 'budget_signal'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (insights) {
        setRecentInsights(insights);
      }

      // Calculate interaction stats
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: interactions } = await supabase
        .from('company_interactions')
        .select('id, company_id, interaction_type, created_at')
        .gte('interaction_date', thirtyDaysAgo.toISOString());

      if (interactions) {
        const stats = {
          total: interactions.length,
          byType: interactions.reduce((acc: any, int: any) => {
            acc[int.interaction_type] = (acc[int.interaction_type] || 0) + 1;
            return acc;
          }, {}),
          companiesWithData: new Set(interactions.map((i: any) => i.company_id)).size,
        };
        setInteractionStats(stats);
      }

    } catch (error) {
      console.error('Error loading intelligence data:', error);
    }
  };

  const handleBackfillData = async () => {
    const result = await backfillTrainingData(180, 1000);
    if (result) {
      toast({
        title: 'Backfill complete',
        description: `Created ${result.records_created} training records`,
      });
    }
  };

  const activeModel = models.find(m => m.status === 'active');
  const runningTests = abTests.filter(t => t.status === 'running');

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
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
          <Button onClick={handleBackfillData} disabled={backfillLoading}>
            <Database className="h-4 w-4 mr-2" />
            {backfillLoading ? 'Backfilling...' : 'Backfill Training Data'}
          </Button>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Model Accuracy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {((activeModel?.metrics as any)?.auc_roc_score * 100).toFixed(1) || 0}%
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

          {/* Model Performance (existing content) */}
          <TabsContent value="models" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>ML Model Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Model performance metrics and feature importance visualization
                </p>
                {/* Add existing model performance content here */}
              </CardContent>
            </Card>
          </TabsContent>

          {/* A/B Tests (existing content) */}
          <TabsContent value="ab-tests" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>A/B Test Results</CardTitle>
              </CardHeader>
              <CardContent>
                {runningTests.length > 0 ? (
                  <div className="space-y-4">
                    {runningTests.map((test: MLABTest) => (
                      <div key={test.id} className="p-4 border rounded-lg">
                        <div className="font-medium mb-2">Test #{test.id}</div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Model A: </span>
                            v{test.model_a_version}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Model B: </span>
                            v{test.model_b_version}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-12">
                    No active A/B tests running
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
