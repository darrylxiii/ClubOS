import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Brain,
  Activity,
  Clock,
  Target,
  AlertTriangle,
  Zap,
  Database,
  RefreshCw,
  Download,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react';
import { useRAGAnalytics } from '@/hooks/useRAGAnalytics';
import { MetricCard } from '@/components/admin/shared/MetricCard';
import { TrendChart } from '@/components/admin/shared/TrendChart';
import { format, subDays } from 'date-fns';

export default function RAGAnalyticsDashboard() {
  // const { t } = useTranslation(['admin']); // Unused, keeping import if needed later but removing variable
  const { t } = { t: (s: string) => s }; // Mock for now or remove if completely unused. Better to just remove the line if unused.
  // Actually, t is unused in the file.

  const [dateRangeKey, setDateRangeKey] = useState<'7d' | '30d' | '90d'>('7d');

  const dateRange = useMemo(() => {
    const end = new Date();
    const daysMap = { '7d': 7, '30d': 30, '90d': 90 };
    const start = subDays(end, daysMap[dateRangeKey]);
    return { start, end };
  }, [dateRangeKey]);

  const {
    metrics,
    trends,
    intentDistribution,
    experimentResults,
    loading,
    refresh
  } = useRAGAnalytics(dateRange);

  const formatPercent = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '—';
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatMs = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '—';
    return `${value.toFixed(0)}ms`;
  };

  const getHealthColor = (score: number) => {
    if (score >= 0.8) return 'text-emerald-500';
    if (score >= 0.6) return 'text-amber-500';
    return 'text-red-500';
  };

  const overallHealth = metrics ?
    ((metrics.precision_at_5 || 0) + (metrics.recall_at_5 || 0) + (1 - (metrics.hallucination_rate || 0))) / 3
    : 0;

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Brain className="h-8 w-8 text-primary" />
            RAG Analytics Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time performance metrics for the retrieval-augmented generation system
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRangeKey} onValueChange={(v) => setDateRangeKey(v as '7d' | '30d' | '90d')}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refresh()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Health Score Banner */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`text-4xl font-bold ${getHealthColor(overallHealth)}`}>
                {loading ? <Skeleton className="h-10 w-20" /> : formatPercent(overallHealth)}
              </div>
              <div>
                <p className="font-medium">System Health Score</p>
                <p className="text-sm text-muted-foreground">
                  Based on precision, recall, and hallucination rate
                </p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-2xl font-semibold">{metrics?.total_queries?.toLocaleString() || '—'}</p>
                <p className="text-xs text-muted-foreground">Total Queries</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold">{formatPercent(metrics?.cache_hit_rate)}</p>
                <p className="text-xs text-muted-foreground">Cache Hit Rate</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold">{formatMs(metrics?.avg_latency_ms)}</p>
                <p className="text-xs text-muted-foreground">Avg Latency</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Precision@5"
          icon={Target}
          primaryMetric={loading ? '...' : formatPercent(metrics?.precision_at_5)}
          description="Relevant results in top 5"
        />
        <MetricCard
          title="Recall@5"
          icon={Database}
          primaryMetric={loading ? '...' : formatPercent(metrics?.recall_at_5)}
          description="Coverage of relevant docs"
        />
        <MetricCard
          title="Context Utilization"
          icon={Zap}
          primaryMetric={loading ? '...' : formatPercent(metrics?.context_utilization)}
          description="Target: 70%"
          secondaryText={metrics?.context_utilization && metrics.context_utilization > 0.65 && metrics.context_utilization < 0.75 ? '✓ Optimal' : undefined}
        />
        <MetricCard
          title="Hallucination Rate"
          icon={AlertTriangle}
          iconColor={metrics?.hallucination_rate && metrics.hallucination_rate > 0.1 ? 'critical' : 'success'}
          primaryMetric={loading ? '...' : formatPercent(metrics?.hallucination_rate)}
          description="AI responses with unsupported claims"
        />
      </div>

      {/* Tabs for detailed views */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="performance">
            <LineChart className="h-4 w-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="latency">
            <Clock className="h-4 w-4 mr-2" />
            Latency
          </TabsTrigger>
          <TabsTrigger value="intents">
            <PieChart className="h-4 w-4 mr-2" />
            Intents
          </TabsTrigger>
          <TabsTrigger value="experiments">
            <BarChart3 className="h-4 w-4 mr-2" />
            A/B Tests
          </TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TrendChart
              title="Precision & Recall Trends"
              description="Daily averages over time"
              data={trends.map(t => ({
                date: format(new Date(t.date), 'MMM d'),
                precision: (t.precision_at_5 || 0) * 100,
                recall: (t.recall_at_5 || 0) * 100,
                f1: (t.f1_at_5 || 0) * 100
              }))}
              lines={[
                { dataKey: 'precision', name: 'Precision@5', color: 'hsl(var(--primary))' },
                { dataKey: 'recall', name: 'Recall@5', color: 'hsl(var(--accent))' },
                { dataKey: 'f1', name: 'F1@5', color: 'hsl(var(--muted-foreground))' }
              ]}
              xAxisKey="date"
              height={300}
            />
            <Card>
              <CardHeader>
                <CardTitle>Context Utilization</CardTitle>
                <CardDescription>Target: 70% utilization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Current</span>
                    <span className="text-2xl font-bold text-primary">
                      {formatPercent(metrics?.context_utilization)}
                    </span>
                  </div>
                  <Progress value={(metrics?.context_utilization || 0) * 100} className="h-3" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <span className="text-primary font-medium">Target: 70%</span>
                    <span>100%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Hallucination Monitoring
              </CardTitle>
              <CardDescription>
                Percentage of AI responses containing unsupported claims
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Current Rate</p>
                  <p className={`text-3xl font-bold ${(metrics?.hallucination_rate || 0) > 0.1 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {formatPercent(metrics?.hallucination_rate)}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Threshold</p>
                  <p className="text-3xl font-bold text-muted-foreground">5%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Latency Tab */}
        <TabsContent value="latency" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Avg Latency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  {loading ? <Skeleton className="h-9 w-24" /> : formatMs(metrics?.avg_latency_ms)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Average response time</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">P95 Latency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-500">
                  {loading ? <Skeleton className="h-9 w-24" /> : formatMs(metrics?.p95_latency_ms)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">95th percentile</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Feedback Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-500">
                  {loading ? <Skeleton className="h-9 w-24" /> : formatPercent(metrics?.feedback_positive_rate)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Positive feedback</p>
              </CardContent>
            </Card>
          </div>

          <TrendChart
            title="Latency Trends Over Time"
            description="Average latency by day"
            data={trends.map(t => ({
              date: format(new Date(t.date), 'MMM d'),
              latency: t.avg_latency_ms
            }))}
            lines={[
              { dataKey: 'latency', name: 'Avg Latency (ms)', color: 'hsl(var(--primary))' }
            ]}
            xAxisKey="date"
            height={350}
          />
        </TabsContent>

        {/* Intents Tab */}
        <TabsContent value="intents" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Query Intent Distribution</CardTitle>
                <CardDescription>Classification of user queries by intent type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {intentDistribution.map((intent) => (
                    <div key={intent.intent_type} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {intent.intent_type.replace('_', ' ')}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {intent.count.toLocaleString()} queries
                          </span>
                        </div>
                        <span className="font-medium">
                          {intent.percentage}%
                        </span>
                      </div>
                      <Progress
                        value={intent.percentage}
                        className="h-2"
                      />
                    </div>
                  ))}
                  {intentDistribution.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">
                      No intent data available yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Intent Summary</CardTitle>
                <CardDescription>Query types breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {intentDistribution.length > 0 ? (
                    intentDistribution.map((intent) => (
                      <div key={intent.intent_type} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="font-medium capitalize">
                            {intent.intent_type.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {intent.count} queries
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-primary">
                            {intent.percentage}%
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No data available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* A/B Tests Tab */}
        <TabsContent value="experiments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Prompt Experiments</CardTitle>
              <CardDescription>
                A/B testing system prompts to optimize response quality
              </CardDescription>
            </CardHeader>
            <CardContent>
              {experimentResults && experimentResults.length > 0 ? (
                <div className="space-y-4">
                  {experimentResults.map((exp) => (
                    <div key={exp.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{exp.experiment_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Variant: {exp.prompt_variant}
                          </p>
                        </div>
                        <Badge variant={exp.is_control ? 'secondary' : 'default'}>
                          {exp.is_control ? 'Control' : 'Variant'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-semibold">
                            {exp.total_impressions.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">Impressions</p>
                        </div>
                        <div>
                          <p className="text-2xl font-semibold text-emerald-500">
                            {exp.positive_feedback}
                          </p>
                          <p className="text-xs text-muted-foreground">Positive</p>
                        </div>
                        <div>
                          <p className="text-2xl font-semibold text-red-500">
                            {exp.negative_feedback}
                          </p>
                          <p className="text-xs text-muted-foreground">Negative</p>
                        </div>
                        <div>
                          <p className="text-2xl font-semibold text-primary">
                            {(exp.success_rate * 100).toFixed(1)}%
                          </p>
                          <p className="text-xs text-muted-foreground">Success Rate</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active experiments</p>
                  <p className="text-sm">Create a prompt experiment to start A/B testing</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Queue Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold">{metrics?.total_queries ?? '—'}</p>
              <p className="text-sm text-muted-foreground">Total Queries</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold">{formatPercent(metrics?.cache_hit_rate)}</p>
              <p className="text-sm text-muted-foreground">Cache Hit Rate</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold">{formatPercent(metrics?.feedback_positive_rate)}</p>
              <p className="text-sm text-muted-foreground">Positive Feedback</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold text-emerald-500">
                {metrics && metrics.hallucination_rate < 0.05 ? 'Healthy' : 'Monitor'}
              </p>
              <p className="text-sm text-muted-foreground">System Status</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
