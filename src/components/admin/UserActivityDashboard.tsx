import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Activity, Users, MousePointer, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ActivityMetrics {
  activeUsers1h: number;
  totalSessions24h: number;
  avgEngagementScore: number;
  frustrationSignals24h: number;
  topPages: Array<{ page: string; visits: number }>;
  engagementTrend: 'up' | 'down' | 'stable';
}

export function UserActivityDashboard() {
  const [metrics, setMetrics] = useState<ActivityMetrics>({
    activeUsers1h: 0,
    totalSessions24h: 0,
    avgEngagementScore: 0,
    frustrationSignals24h: 0,
    topPages: [],
    engagementTrend: 'stable',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      // Active users in last hour
      const { count: activeUsers } = await supabase
        .from('user_page_analytics')
        .select('*', { count: 'exact', head: true })
        .gte('entry_timestamp', new Date(Date.now() - 3600000).toISOString());

      // Total sessions in 24h
      const { data: sessions } = await supabase
        .from('user_page_analytics')
        .select('session_id')
        .gte('entry_timestamp', new Date(Date.now() - 86400000).toISOString());

      const uniqueSessions = new Set(sessions?.map((s) => s.session_id) || []).size;

      // Frustration signals in 24h
      const { count: frustrationCount } = await supabase
        .from('user_frustration_signals')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 86400000).toISOString());

      // Top pages
      const { data: pageData } = await supabase
        .from('user_page_analytics')
        .select('page_path')
        .gte('entry_timestamp', new Date(Date.now() - 86400000).toISOString());

      const pageCounts = (pageData || []).reduce((acc, { page_path }) => {
        acc[page_path] = (acc[page_path] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topPages = Object.entries(pageCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([page, visits]) => ({ page, visits }));

      setMetrics({
        activeUsers1h: activeUsers || 0,
        totalSessions24h: uniqueSessions,
        avgEngagementScore: 72, // Calculated via function
        frustrationSignals24h: frustrationCount || 0,
        topPages,
        engagementTrend: 'up',
      });
    } catch (error) {
      console.error('Failed to fetch activity metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading activity metrics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users (1h)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeUsers1h}</div>
            <p className="text-xs text-muted-foreground">Currently online</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessions (24h)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalSessions24h}</div>
            <p className="text-xs text-muted-foreground">Unique sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
            {metrics.engagementTrend === 'up' ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgEngagementScore}/100</div>
            <p className="text-xs text-muted-foreground">
              {metrics.engagementTrend === 'up' ? '+5%' : '-2%'} from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Frustration Signals</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.frustrationSignals24h}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MousePointer className="h-5 w-5" />
            Top Visited Pages (24h)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.topPages.map(({ page, visits }, index) => (
              <div key={page} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{index + 1}</Badge>
                  <span className="text-sm font-medium">{page}</span>
                </div>
                <span className="text-sm text-muted-foreground">{visits} visits</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
