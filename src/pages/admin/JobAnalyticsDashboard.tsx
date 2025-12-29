import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/components/AppLayout';
import { useJobAnalytics } from '@/hooks/useJobAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, TrendingUp, Clock, Target, Zap, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, FunnelChart, Funnel, LabelList } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(142, 76%, 36%)', 'hsl(var(--accent))'];

export default function JobAnalyticsDashboard() {
  const { jobId } = useParams<{ jobId: string }>();
  const { data, loading, error } = useJobAnalytics(jobId);

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto py-8 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </AppLayout>
    );
  }

  if (error || !data) {
    return (
      <AppLayout>
        <div className="container mx-auto py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Failed to load analytics</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
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
    <AppLayout>
      <div className="container mx-auto py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Job Analytics</h1>
          <p className="text-muted-foreground">Detailed performance metrics for this role</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg"><Users className="h-6 w-6" /></div>
                <div>
                  <p className="text-2xl font-bold">{data.totalApplications}</p>
                  <p className="text-sm text-muted-foreground">Total Applications</p>
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
                  <p className="text-sm text-muted-foreground">Active</p>
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
                  <p className="text-sm text-muted-foreground">Hires</p>
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
                  <p className="text-sm text-muted-foreground">Avg Time to Hire</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="sourcing" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sourcing"><PieChartIcon className="h-4 w-4 mr-2" />Sourcing</TabsTrigger>
            <TabsTrigger value="funnel"><BarChart3 className="h-4 w-4 mr-2" />Pipeline</TabsTrigger>
            <TabsTrigger value="time"><Clock className="h-4 w-4 mr-2" />Time in Stage</TabsTrigger>
          </TabsList>

          <TabsContent value="sourcing">
            <Card>
              <CardHeader>
                <CardTitle>Sourcing Breakdown</CardTitle>
                <CardDescription>Where candidates are coming from</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={sourcingData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={120}
                      dataKey="value"
                    >
                      {sourcingData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="funnel">
            <Card>
              <CardHeader>
                <CardTitle>Pipeline Conversion Funnel</CardTitle>
                <CardDescription>Candidates progressing through stages</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={funnelData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="time">
            <Card>
              <CardHeader>
                <CardTitle>Time in Stage</CardTitle>
                <CardDescription>Average days spent in each pipeline stage</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={timeInStageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stage" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="days" fill="hsl(var(--primary))" name="Days" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
