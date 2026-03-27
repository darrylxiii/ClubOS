import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// AppLayout removed - provided by ProtectedLayout
import { useJobAnalytics } from '@/hooks/useJobAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, TrendingUp, Clock, Target, Zap, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { DynamicChart } from '@/components/charts/DynamicChart';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(142, 76%, 36%)', 'hsl(var(--accent))'];

export default function JobAnalyticsDashboard() {
  const { t } = useTranslation('common');
  const { jobId } = useParams<{ jobId: string }>();
  const { data, loading, error } = useJobAnalytics(jobId);

  if (loading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
          <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">{t("failed_to_load_analytics", "Failed to load analytics")}</p>
            </CardContent>
          </Card>
      </div>
    );
  }

  const sourcingData = [
    { name: 'Club Sync', value: data.sourcing.clubSync },
    { name: 'Direct Apply', value: data.sourcing.directApply },
    { name: 'Referrals', value: data.sourcing.referrals },
    { name: 'Other', value: data.sourcing.other },
  ].filter(item => item.value > 0);

  const funnelData = data.pipelinePerformance.stageConversions.map((stage, idx) => ({
    name: stage.from,
    value: stage.count,
    rate: stage.rate,
    fill: COLORS[idx % COLORS.length],
  }));

  const timeInStageData = data.timeMetrics.avgTimeInStages.map(stage => ({
    stage: stage.stage,
    days: stage.avgDays || 0,
  }));

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("job_analytics", "Job Analytics")}</h1>
        <p className="text-muted-foreground">{t("detailed_performance_metrics_for", "Detailed performance metrics for this role")}</p>
      </div>

      {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg"><Users className="h-6 w-6" /></div>
                <div>
                  <p className="text-2xl font-bold">{data.totalApplications}</p>
                  <p className="text-sm text-muted-foreground">{t("total_applications", "Total Applications")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg"><TrendingUp className="h-6 w-6" /></div>
                <div>
                  <p className="text-2xl font-bold">{data.activeApplications}</p>
                  <p className="text-sm text-muted-foreground">{t("active", "Active")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg"><Target className="h-6 w-6" /></div>
                <div>
                  <p className="text-2xl font-bold">{data.totalHires}</p>
                  <p className="text-sm text-muted-foreground">{t("hires", "Hires")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg"><Clock className="h-6 w-6" /></div>
                <div>
                  <p className="text-2xl font-bold">{data.timeMetrics.totalTimeToHire}d</p>
                  <p className="text-sm text-muted-foreground">{t("avg_time_to_hire", "Avg Time to Hire")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="sourcing" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sourcing"><PieChartIcon className="h-4 w-4 mr-2" />{t("sourcing", "Sourcing")}</TabsTrigger>
            <TabsTrigger value="funnel"><BarChart3 className="h-4 w-4 mr-2" />{t("pipeline", "Pipeline")}</TabsTrigger>
            <TabsTrigger value="time"><Clock className="h-4 w-4 mr-2" />{t("time_in_stage", "Time in Stage")}</TabsTrigger>
          </TabsList>

          <TabsContent value="sourcing">
            <Card>
              <CardHeader>
                <CardTitle>{t("sourcing_breakdown", "Sourcing Breakdown")}</CardTitle>
                <CardDescription>{t("where_candidates_are_coming", "Where candidates are coming from")}</CardDescription>
              </CardHeader>
              <CardContent>
                <DynamicChart
                  type="pie"
                  data={sourcingData}
                  height={350}
                  config={{
                    pie: {
                      dataKey: 'value',
                      outerRadius: 120,
                      colors: COLORS,
                      label: ({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`,
                    },
                    showTooltip: true,
                    legend: true,
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="funnel">
            <Card>
              <CardHeader>
                <CardTitle>{t("pipeline_conversion_funnel", "Pipeline Conversion Funnel")}</CardTitle>
                <CardDescription>{t("candidates_progressing_through_stages", "Candidates progressing through stages")}</CardDescription>
              </CardHeader>
              <CardContent>
                <DynamicChart
                  type="bar"
                  data={funnelData}
                  height={350}
                  config={{
                    layout: 'vertical',
                    xAxisKey: 'name',
                    bars: [{ dataKey: 'value', fill: 'hsl(var(--primary))' }],
                    showTooltip: true,
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="time">
            <Card>
              <CardHeader>
                <CardTitle>{t("time_in_stage", "Time in Stage")}</CardTitle>
                <CardDescription>{t("average_days_spent_in", "Average days spent in each pipeline stage")}</CardDescription>
              </CardHeader>
              <CardContent>
                <DynamicChart
                  type="bar"
                  data={timeInStageData}
                  height={350}
                  config={{
                    xAxisKey: 'stage',
                    bars: [{ dataKey: 'days', fill: 'hsl(var(--primary))', name: 'Days' }],
                    showTooltip: true,
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </div>
  );
}
