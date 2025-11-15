import { useState, useEffect } from 'react';
import { Brain, TrendingUp, Users, Target, Zap, Database } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMLMatching } from '@/hooks/useMLMatching';
import type { MLModel, MLABTest, MLModelMetrics } from '@/types/ml';

export default function MLDashboard() {
  const [models, setModels] = useState<MLModel[]>([]);
  const [abTests, setABTests] = useState<MLABTest[]>([]);
  const [metrics, setMetrics] = useState<MLModelMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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
              ML Matching Engine
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor and manage the AI-powered matching system
            </p>
          </div>
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
              <CardTitle className="text-sm font-medium text-muted-foreground">AUC-ROC Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {activeModel?.metrics?.auc_roc 
                  ? (activeModel.metrics.auc_roc * 100).toFixed(1) + '%'
                  : 'N/A'
                }
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Model accuracy
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Running A/B Tests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{runningTests.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Active experiments
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
        </div>

        {/* Main Content */}
        <Tabs defaultValue="models" className="space-y-4">
          <TabsList>
            <TabsTrigger value="models">Models</TabsTrigger>
            <TabsTrigger value="ab-tests">A/B Tests</TabsTrigger>
            <TabsTrigger value="metrics">Performance</TabsTrigger>
          </TabsList>

          {/* Models Tab */}
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

                        {/* Metrics */}
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

          {/* A/B Tests Tab */}
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

                        {/* Traffic Split */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span>Traffic Split</span>
                            <span>{Math.round(test.traffic_split * 100)}% / {Math.round((1 - test.traffic_split) * 100)}%</span>
                          </div>
                          <Progress value={test.traffic_split * 100} className="h-2" />
                        </div>

                        {/* Sample Sizes */}
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

          {/* Metrics Tab */}
          <TabsContent value="metrics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>
                  Time-series performance tracking
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading metrics...</div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Performance charts coming soon...
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
