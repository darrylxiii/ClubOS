import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  Zap,
} from 'lucide-react';
import { errorMonitoring } from '@/services/errorMonitoring';
import { performanceMonitor } from '@/utils/performanceMonitor';

const SEVERITY_COLORS = {
  critical: 'hsl(var(--destructive))',
  error: 'hsl(0, 84%, 60%)',
  warning: 'hsl(38, 92%, 50%)',
  info: 'hsl(217, 91%, 60%)',
};

/**
 * Error Analytics Dashboard
 * Provides comprehensive error visualization and insights
 */
export function ErrorAnalyticsDashboard() {
  // Fetch error trends
  const { data: trends = [] } = useQuery({
    queryKey: ['error-trends'],
    queryFn: () => errorMonitoring.getErrorTrends(7),
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch top error components
  const { data: topComponents = [] } = useQuery({
    queryKey: ['top-error-components'],
    queryFn: () => errorMonitoring.getTopErrorComponents(10),
    refetchInterval: 60000,
  });

  // Fetch resolution stats
  const { data: resolutionStats } = useQuery({
    queryKey: ['resolution-stats'],
    queryFn: () => errorMonitoring.getResolutionStats(),
    refetchInterval: 60000,
  });

  // Get performance summary
  const perfSummary = useMemo(() => performanceMonitor.getSummary(), []);

  // Calculate totals
  const totalErrors = useMemo(() => 
    trends.reduce((sum, t) => sum + t.total, 0), 
    [trends]
  );

  const criticalErrors = useMemo(() => 
    trends.reduce((sum, t) => sum + t.critical, 0), 
    [trends]
  );

  // Calculate trend direction
  const trendDirection = useMemo(() => {
    if (trends.length < 2) return 'stable';
    const recent = trends.slice(-3).reduce((sum, t) => sum + t.total, 0) / 3;
    const earlier = trends.slice(0, 3).reduce((sum, t) => sum + t.total, 0) / 3;
    if (recent > earlier * 1.2) return 'up';
    if (recent < earlier * 0.8) return 'down';
    return 'stable';
  }, [trends]);

  // Pie chart data for severity distribution
  const severityData = useMemo(() => {
    const totals = trends.reduce(
      (acc, t) => ({
        critical: acc.critical + t.critical,
        error: acc.error + t.error,
        warning: acc.warning + t.warning,
        info: acc.info + t.info,
      }),
      { critical: 0, error: 0, warning: 0, info: 0 }
    );

    return Object.entries(totals).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: SEVERITY_COLORS[name as keyof typeof SEVERITY_COLORS],
    }));
  }, [trends]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Errors */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Errors (7d)</p>
                <p className="text-2xl font-bold">{totalErrors}</p>
              </div>
              <div className={`p-3 rounded-full ${
                trendDirection === 'up' ? 'bg-destructive/10' : 
                trendDirection === 'down' ? 'bg-green-500/10' : 'bg-muted'
              }`}>
                {trendDirection === 'up' ? (
                  <TrendingUp className="h-6 w-6 text-destructive" />
                ) : trendDirection === 'down' ? (
                  <TrendingDown className="h-6 w-6 text-green-600" />
                ) : (
                  <Activity className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Critical Errors */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical Errors</p>
                <p className="text-2xl font-bold text-destructive">{criticalErrors}</p>
              </div>
              <div className="p-3 rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resolution Rate */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resolution Rate</p>
                <p className="text-2xl font-bold">
                  {resolutionStats?.resolutionRate.toFixed(1) || 0}%
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-500/10">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <Progress 
              value={resolutionStats?.resolutionRate || 0} 
              className="mt-3 h-2"
            />
          </CardContent>
        </Card>

        {/* Avg Resolution Time */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Resolution Time</p>
                <p className="text-2xl font-bold">
                  {resolutionStats?.avgResolutionTimeHours.toFixed(1) || 0}h
                </p>
              </div>
              <div className="p-3 rounded-full bg-amber-500/10">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for detailed views */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Error Trends</TabsTrigger>
          <TabsTrigger value="components">Top Components</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Error Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Line Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Error Trend (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trends}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="period" 
                        tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { weekday: 'short' })}
                        className="text-xs"
                      />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="total" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="critical" 
                        stroke="hsl(var(--destructive))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--destructive))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Severity Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Severity Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={severityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {severityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {severityData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-1">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {entry.name}: {entry.value}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Top Components Tab */}
        <TabsContent value="components">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Error-Producing Components</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topComponents} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis 
                      type="category" 
                      dataKey="component" 
                      className="text-xs"
                      width={150}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar 
                      dataKey="count" 
                      fill="hsl(var(--primary))" 
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Web Vitals */}
            {Object.entries(perfSummary.metrics).map(([name, metric]) => (
              metric && (
                <Card key={name}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{name}</span>
                      <Badge variant={
                        metric.rating === 'good' ? 'default' :
                        metric.rating === 'needs-improvement' ? 'secondary' : 'destructive'
                      }>
                        {metric.rating}
                      </Badge>
                    </div>
                    <p className="text-2xl font-bold">
                      {metric.value.toFixed(name === 'CLS' ? 3 : 0)}
                      {name !== 'CLS' && 'ms'}
                    </p>
                  </CardContent>
                </Card>
              )
            ))}

            {/* Long Tasks */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Long Tasks</span>
                  <Zap className="h-4 w-4 text-amber-500" />
                </div>
                <p className="text-2xl font-bold">{perfSummary.longTaskCount}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg: {perfSummary.avgLongTaskDuration.toFixed(0)}ms
                </p>
              </CardContent>
            </Card>

            {/* Memory Pressure */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Memory Status</span>
                  {perfSummary.memoryPressure ? (
                    <XCircle className="h-4 w-4 text-destructive" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                </div>
                <p className="text-2xl font-bold">
                  {perfSummary.memoryPressure ? 'High' : 'Normal'}
                </p>
              </CardContent>
            </Card>

            {/* Overall Rating */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Overall Performance</span>
                </div>
                <Badge 
                  variant={
                    perfSummary.overallRating === 'good' ? 'default' :
                    perfSummary.overallRating === 'needs-improvement' ? 'secondary' : 'destructive'
                  }
                  className="text-lg py-1 px-3"
                >
                  {perfSummary.overallRating.replace('-', ' ').toUpperCase()}
                </Badge>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
