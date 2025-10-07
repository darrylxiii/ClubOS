import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Heart, Share2, Bookmark, TrendingUp, Clock, Users } from "lucide-react";
import { TimeRangeSelector, TimeRange } from "./TimeRangeSelector";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

export function StoryAnalytics() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [customRange, setCustomRange] = useState<{ from: Date; to: Date } | undefined>(undefined);
  const [stats, setStats] = useState({
    totalViews: 0,
    totalReactions: 0,
    totalShares: 0,
    totalSaves: 0,
    avgWatchTime: 0,
    completionRate: 0,
  });
  const [storiesData, setStoriesData] = useState<any[]>([]);
  const [engagementTrend, setEngagementTrend] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchStoryAnalytics();
    }
  }, [user, timeRange, customRange]);

  const fetchStoryAnalytics = async () => {
    if (!user) return;

    const { start, end } = getDateRange();

    // Fetch user's stories
    const { data: stories } = await supabase
      .from('stories')
      .select('id, created_at, media_type, caption')
      .eq('user_id', user.id)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false });

    if (!stories || stories.length === 0) {
      setStats({
        totalViews: 0,
        totalReactions: 0,
        totalShares: 0,
        totalSaves: 0,
        avgWatchTime: 0,
        completionRate: 0,
      });
      return;
    }

    const storyIds = stories.map(s => s.id);

    // Fetch analytics for all stories
    const supabaseAny = supabase as any;
    const [views, reactions, shares, saves] = await Promise.all([
      supabaseAny.from('story_views').select('*').in('story_id', storyIds),
      supabaseAny.from('story_reactions').select('*').in('story_id', storyIds),
      supabaseAny.from('story_shares').select('*').in('story_id', storyIds),
      supabaseAny.from('story_saves').select('*').in('story_id', storyIds),
    ]);

    // Calculate overall stats
    const totalViews = views.data?.length || 0;
    const totalReactions = reactions.data?.length || 0;
    const totalShares = shares.data?.length || 0;
    const totalSaves = saves.data?.length || 0;

    const completedViews = views.data?.filter(v => v.completed).length || 0;
    const completionRate = totalViews > 0 ? (completedViews / totalViews) * 100 : 0;

    const totalWatchTime = views.data?.reduce((sum, v) => sum + (v.watch_duration_seconds || 0), 0) || 0;
    const avgWatchTime = totalViews > 0 ? totalWatchTime / totalViews : 0;

    setStats({
      totalViews,
      totalReactions,
      totalShares,
      totalSaves,
      avgWatchTime: Math.round(avgWatchTime),
      completionRate: Math.round(completionRate),
    });

    // Per-story data
    const storiesWithStats = stories.map(story => {
      const storyViews = views.data?.filter(v => v.story_id === story.id).length || 0;
      const storyReactions = reactions.data?.filter(r => r.story_id === story.id).length || 0;
      const storyShares = shares.data?.filter(s => s.story_id === story.id).length || 0;
      const storySaves = saves.data?.filter(s => s.story_id === story.id).length || 0;

      return {
        ...story,
        views: storyViews,
        reactions: storyReactions,
        shares: storyShares,
        saves: storySaves,
        engagement: storyViews > 0 ? ((storyReactions + storyShares + storySaves) / storyViews) * 100 : 0,
      };
    });

    setStoriesData(storiesWithStats);

    // Engagement trend by day
    const dayMap = new Map<string, { views: number; reactions: number; shares: number }>();
    
    views.data?.forEach(v => {
      const day = new Date(v.viewed_at).toLocaleDateString();
      const existing = dayMap.get(day) || { views: 0, reactions: 0, shares: 0 };
      dayMap.set(day, { ...existing, views: existing.views + 1 });
    });

    reactions.data?.forEach(r => {
      const day = new Date(r.created_at).toLocaleDateString();
      const existing = dayMap.get(day) || { views: 0, reactions: 0, shares: 0 };
      dayMap.set(day, { ...existing, reactions: existing.reactions + 1 });
    });

    shares.data?.forEach(s => {
      const day = new Date(s.created_at).toLocaleDateString();
      const existing = dayMap.get(day) || { views: 0, reactions: 0, shares: 0 };
      dayMap.set(day, { ...existing, shares: existing.shares + 1 });
    });

    const trendData = Array.from(dayMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setEngagementTrend(trendData);
  };

  const getDateRange = () => {
    if (customRange) {
      return { start: customRange.from, end: customRange.to };
    }

    const end = new Date();
    const start = new Date();

    switch (timeRange) {
      case '1h': start.setHours(start.getHours() - 1); break;
      case '3h': start.setHours(start.getHours() - 3); break;
      case '12h': start.setHours(start.getHours() - 12); break;
      case 'today': start.setHours(0, 0, 0, 0); break;
      case 'yesterday': 
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        break;
      case '3d': start.setDate(start.getDate() - 3); break;
      case '7d': start.setDate(start.getDate() - 7); break;
      case '14d': start.setDate(start.getDate() - 14); break;
      case '30d': start.setDate(start.getDate() - 30); break;
      case '3m': start.setMonth(start.getMonth() - 3); break;
      case '6m': start.setMonth(start.getMonth() - 6); break;
      case '12m': start.setFullYear(start.getFullYear() - 1); break;
    }

    return { start, end };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Story Analytics</h2>
        <TimeRangeSelector
          value={timeRange}
          customRange={customRange}
          onChange={(range, custom) => {
            setTimeRange(range);
            setCustomRange(custom);
          }}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalViews}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reactions</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReactions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shares</CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalShares}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saves</CardTitle>
            <Bookmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSaves}</div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Watch Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgWatchTime}s</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completionRate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalViews > 0 
                ? Math.round(((stats.totalReactions + stats.totalShares + stats.totalSaves) / stats.totalViews) * 100)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for detailed views */}
      <Tabs defaultValue="trend" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trend">Engagement Trend</TabsTrigger>
          <TabsTrigger value="stories">Per Story</TabsTrigger>
        </TabsList>

        <TabsContent value="trend">
          <Card>
            <CardHeader>
              <CardTitle>Engagement Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={engagementTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="views" stroke="#8884d8" name="Views" />
                  <Line type="monotone" dataKey="reactions" stroke="#82ca9d" name="Reactions" />
                  <Line type="monotone" dataKey="shares" stroke="#ffc658" name="Shares" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stories">
          <Card>
            <CardHeader>
              <CardTitle>Story Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={storiesData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="created_at" tickFormatter={(val) => new Date(val).toLocaleDateString()} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="views" fill="#8884d8" name="Views" />
                  <Bar dataKey="reactions" fill="#82ca9d" name="Reactions" />
                  <Bar dataKey="shares" fill="#ffc658" name="Shares" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}