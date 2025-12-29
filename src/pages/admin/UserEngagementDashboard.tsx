import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLayout } from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Activity, Clock, MousePointer } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';

interface EngagementMetrics {
  totalUsers: number;
  avgSessionTime: number;
  totalPageViews: number;
  totalActions: number;
  dailyTrend: Array<{ date: string; users: number; sessions: number; pageViews: number }>;
  featureUsage: Array<{ feature: string; count: number }>;
}

export default function UserEngagementDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<EngagementMetrics>({
    totalUsers: 0,
    avgSessionTime: 0,
    totalPageViews: 0,
    totalActions: 0,
    dailyTrend: [],
    featureUsage: [],
  });

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

      const { data: engagementData } = await (supabase as any)
        .from('user_engagement_daily')
        .select('*')
        .gte('date', thirtyDaysAgo)
        .order('date', { ascending: true });

      if (engagementData && engagementData.length > 0) {
        const uniqueUsers = new Set(engagementData.map((d: any) => d.user_id)).size;
        const totalTime = engagementData.reduce((sum: number, d: any) => sum + (d.total_time_seconds || 0), 0);
        const totalViews = engagementData.reduce((sum: number, d: any) => sum + (d.page_views || 0), 0);
        const totalActs = engagementData.reduce((sum: number, d: any) => sum + (d.actions_performed || 0), 0);

        // Aggregate by date
        const byDate = engagementData.reduce((acc: any, d: any) => {
          const date = d.date;
          if (!acc[date]) {
            acc[date] = { users: new Set(), sessions: 0, pageViews: 0 };
          }
          acc[date].users.add(d.user_id);
          acc[date].sessions += d.session_count || 0;
          acc[date].pageViews += d.page_views || 0;
          return acc;
        }, {});

        const dailyTrend = Object.entries(byDate).map(([date, data]: [string, any]) => ({
          date: format(new Date(date), 'MMM d'),
          users: data.users.size,
          sessions: data.sessions,
          pageViews: data.pageViews,
        }));

        // Aggregate feature usage
        const featureMap: Record<string, number> = {};
        engagementData.forEach((d: any) => {
          const usage = d.feature_usage || {};
          Object.entries(usage).forEach(([feature, count]) => {
            featureMap[feature] = (featureMap[feature] || 0) + (count as number);
          });
        });

        const featureUsage = Object.entries(featureMap)
          .map(([feature, count]) => ({ feature, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        setMetrics({
          totalUsers: uniqueUsers,
          avgSessionTime: uniqueUsers > 0 ? Math.round(totalTime / uniqueUsers / 60) : 0,
          totalPageViews: totalViews,
          totalActions: totalActs,
          dailyTrend,
          featureUsage,
        });
      }
    } catch (error) {
      console.error('Error loading engagement metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto py-8 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">User Engagement</h1>
          <p className="text-muted-foreground">Platform usage and engagement metrics</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg"><Users className="h-6 w-6" /></div>
                <div>
                  <p className="text-2xl font-bold">{metrics.totalUsers}</p>
                  <p className="text-sm text-muted-foreground">Active Users (30d)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg"><Clock className="h-6 w-6" /></div>
                <div>
                  <p className="text-2xl font-bold">{metrics.avgSessionTime}m</p>
                  <p className="text-sm text-muted-foreground">Avg Session Time</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg"><Activity className="h-6 w-6" /></div>
                <div>
                  <p className="text-2xl font-bold">{metrics.totalPageViews.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Page Views</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg"><MousePointer className="h-6 w-6" /></div>
                <div>
                  <p className="text-2xl font-bold">{metrics.totalActions.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Actions Performed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily Active Users</CardTitle>
              <CardDescription>User activity trend over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics.dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="users" stroke="hsl(var(--primary))" name="Active Users" />
                  <Line type="monotone" dataKey="sessions" stroke="hsl(var(--secondary))" name="Sessions" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Features</CardTitle>
              <CardDescription>Most used platform features</CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.featureUsage.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.featureUsage} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="feature" type="category" width={120} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No feature usage data
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
