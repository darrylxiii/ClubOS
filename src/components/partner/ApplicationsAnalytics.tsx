import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  Target,
  AlertTriangle
} from "lucide-react";
import { useRecharts } from "@/hooks/useRecharts";
import { useTranslation } from 'react-i18next';

interface ApplicationsAnalyticsProps {
  applications: any[];
  jobs: any[];
}

export const ApplicationsAnalytics = ({ applications, jobs }: ApplicationsAnalyticsProps) => {
  const { t } = useTranslation('partner');
  const { recharts, isLoading: rechartsLoading } = useRecharts();

  // Calculate conversion rates by stage
  const stageConversion = applications.reduce((acc: any, app) => {
    const stage = app.stages?.[app.current_stage_index]?.name || 'Unknown';
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {});

  const stageData = Object.entries(stageConversion).map(([name, count]) => ({
    name,
    count
  }));

  const sourceData = applications.reduce((acc: any, app) => {
    const source = app.candidate_profiles?.source_channel || 'Direct';
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {});

  const sourceChartData = Object.entries(sourceData).map(([name, value]) => ({
    name,
    value
  }));

  const hiredApps = applications.filter(a => a.status === 'hired');
  const avgTimeToHire = hiredApps.length > 0 
    ? hiredApps.reduce((sum, app) => {
        const days = Math.floor((new Date(app.updated_at).getTime() - new Date(app.applied_at).getTime()) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0) / hiredApps.length
    : 0;

  const bottlenecks = stageData
    .filter(s => (s.count as number) > applications.length * 0.3)
    .sort((a, b) => (b.count as number) - (a.count as number));

  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return date.toISOString().split('T')[0];
  });

  const trendData = last30Days.map(date => ({
    date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    applications: applications.filter(a => 
      a.applied_at.startsWith(date)
    ).length
  }));

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  if (rechartsLoading || !recharts) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } = recharts;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t('applicationsAnalytics.avgTimeToHire')}</p>
              <div className="flex items-center gap-2">
                <p className="text-3xl font-bold">{Math.round(avgTimeToHire)}</p>
                <p className="text-sm text-muted-foreground">days</p>
              </div>
              {avgTimeToHire < 30 ? (
                <div className="flex items-center gap-1 text-green-500 text-sm">
                  <TrendingDown className="w-4 h-4" />
                  <span>{t('applicationsAnalytics.excellent')}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-amber-500 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  <span>{t('applicationsAnalytics.needsImprovement')}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t('applicationsAnalytics.conversionRate')}</p>
              <div className="flex items-center gap-2">
                <p className="text-3xl font-bold">
                  {applications.length > 0 
                    ? Math.round((hiredApps.length / applications.length) * 100)
                    : 0}
                </p>
                <p className="text-sm text-muted-foreground">%</p>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground text-sm">
                <Target className="w-4 h-4" />
                <span>{hiredApps.length} hired</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t('applicationsAnalytics.activePipelines')}</p>
              <div className="flex items-center gap-2">
                <p className="text-3xl font-bold">
                  {applications.filter(a => a.status === 'active').length}
                </p>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground text-sm">
                <Users className="w-4 h-4" />
                <span>{t('applicationsAnalytics.inProgress')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t('applicationsAnalytics.stalledPipelines')}</p>
              <div className="flex items-center gap-2">
                <p className="text-3xl font-bold">
                  {applications.filter(a => {
                    const lastActivity = a.candidate_profiles?.last_activity_at;
                    if (!lastActivity) return true;
                    const daysSince = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
                    return daysSince > 14;
                  }).length}
                </p>
              </div>
              <div className="flex items-center gap-1 text-amber-500 text-sm">
                <Clock className="w-4 h-4" />
                <span>{t('applicationsAnalytics.needAttention')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('applicationsAnalytics.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('applicationsAnalytics.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sourceChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {sourceChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Application Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Applications Trend (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="applications" stroke="#6366f1" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Bottleneck Analysis */}
      {bottlenecks.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="w-5 h-5" />
              Potential Bottlenecks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bottlenecks.map((stage, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-background rounded border">
                  <div>
                    <p className="font-bold">{stage.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {String(stage.count)} candidates stuck in this stage
                    </p>
                  </div>
                  <Badge variant="outline" className="border-amber-500 text-amber-500">
                    {Math.round(((stage.count as number) / applications.length) * 100)}% of total
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
