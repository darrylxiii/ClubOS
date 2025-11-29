import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Clock, MousePointer, Eye, TrendingUp } from "lucide-react";

export default function EngagementAnalyticsTab() {
  const { data: engagementData } = useQuery({
    queryKey: ['engagement-analytics'],
    queryFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      
      // Try dedicated analytics table first
      const { data: pageAnalytics } = await supabase
        .from('user_page_analytics')
        .select('*')
        .gte('entry_timestamp', sevenDaysAgo);

      // Fallback to session events if no page analytics
      let pageMetrics: any = {};
      
      if (pageAnalytics && pageAnalytics.length > 0) {
        pageMetrics = pageAnalytics.reduce((acc: any, page: any) => {
          const path = page.page_path;
          if (!acc[path]) {
            acc[path] = {
              path,
              views: 0,
              totalTime: 0,
              totalScroll: 0,
              engaged: 0,
              bounced: 0
            };
          }
          acc[path].views += 1;
          acc[path].totalTime += page.time_on_page_seconds || 0;
          acc[path].totalScroll += page.scroll_depth_max || 0;
          if (page.engaged) acc[path].engaged += 1;
          if (page.bounce) acc[path].bounced += 1;
          return acc;
        }, {});
      } else {
        // Fallback: calculate from session events
        const { data: sessionEvents } = await supabase
          .from('user_session_events')
          .select('page_path, event_timestamp, event_type, metadata')
          .gte('event_timestamp', sevenDaysAgo)
          .order('event_timestamp', { ascending: true });

        pageMetrics = (sessionEvents || []).reduce((acc: any, event: any) => {
          const path = event.page_path || '/';
          if (!acc[path]) {
            acc[path] = {
              path,
              views: 0,
              totalTime: 0,
              totalScroll: 0,
              engaged: 0,
              bounced: 0
            };
          }
          
          if (event.event_type === 'page_view') acc[path].views += 1;
          if (event.event_type === 'scroll') {
            acc[path].totalScroll += event.metadata?.scrollDepthPercent || 0;
          }
          if (event.metadata?.timeOnElementMs) {
            acc[path].totalTime += Math.floor(event.metadata.timeOnElementMs / 1000);
          }
          
          return acc;
        }, {});
      }

      const topPages = Object.values(pageMetrics)
        .map((page: any) => ({
          ...page,
          avgTime: page.views > 0 ? Math.round(page.totalTime / page.views) : 0,
          avgScroll: page.views > 0 ? Math.round(page.totalScroll / page.views) : 0,
          engagementRate: page.views > 0 ? Math.round((page.engaged / page.views) * 100) : 0,
          bounceRate: page.views > 0 ? Math.round((page.bounced / page.views) * 100) : 0
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

      return { topPages };
    },
    refetchInterval: 60000
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Time on Page</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {engagementData?.topPages?.[0]?.avgTime || 0}s
            </div>
            <p className="text-xs text-muted-foreground">Top performing page</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Scroll Depth</CardTitle>
            <MousePointer className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {engagementData?.topPages?.[0]?.avgScroll || 0}%
            </div>
            <p className="text-xs text-muted-foreground">Content visibility</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {engagementData?.topPages?.[0]?.engagementRate || 0}%
            </div>
            <p className="text-xs text-muted-foreground">Active users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
            <Eye className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {engagementData?.topPages?.[0]?.bounceRate || 0}%
            </div>
            <p className="text-xs text-muted-foreground">Quick exits</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Page Views & Engagement</CardTitle>
          <CardDescription>Top 10 pages by view count</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={engagementData?.topPages || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="path" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="views" fill="hsl(var(--primary))" name="Views" />
              <Bar dataKey="engaged" fill="hsl(var(--chart-2))" name="Engaged" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Average Time on Page</CardTitle>
            <CardDescription>In seconds</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={engagementData?.topPages || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="path" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="avgTime" stroke="hsl(var(--chart-3))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scroll Depth Distribution</CardTitle>
            <CardDescription>Average scroll percentage</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={engagementData?.topPages || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="path" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="avgScroll" fill="hsl(var(--chart-4))" name="Avg Scroll %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
