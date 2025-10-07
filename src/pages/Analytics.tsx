import { AppLayout } from "@/components/AppLayout";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  TrendingUp, 
  Eye, 
  Heart, 
  Share2, 
  Users, 
  Award,
  Zap,
  Download,
  Sparkles,
  Activity
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { RealTimeStats } from "@/components/analytics/RealTimeStats";
import { ViralMapVisualization } from "@/components/analytics/ViralMapVisualization";
import { AudienceInsights } from "@/components/analytics/AudienceInsights";
import { MilestonesGamification } from "@/components/analytics/MilestonesGamification";

const Analytics = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<any[]>([]);
  const [profileStats, setProfileStats] = useState<any>(null);
  const [achievements, setAchievements] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    try {
      // Fetch profile analytics
      const { data: profileData } = await supabase
        .from("profile_analytics")
        .select("*")
        .eq("user_id", user?.id)
        .order("date", { ascending: false })
        .limit(1)
        .single();

      setProfileStats(profileData);

      // Fetch insights
      const { data: insightsData } = await supabase
        .from("analytics_insights")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(10);

      setInsights(insightsData || []);

      // Fetch achievements
      const { data: achievementsData } = await supabase
        .from("user_achievements")
        .select("*")
        .eq("user_id", user?.id)
        .order("unlocked_at", { ascending: false });

      setAchievements(achievementsData || []);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
  };

  const generateAIInsights = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-analytics-insights", {
        body: { userId: user?.id },
      });

      if (error) throw error;

      toast.success("AI insights generated successfully!");
      fetchAnalytics();
    } catch (error: any) {
      toast.error(error.message || "Failed to generate insights");
    } finally {
      setLoading(false);
    }
  };

  const exportAnalytics = async () => {
    try {
      const { data } = await supabase
        .from("profile_analytics")
        .select("*")
        .eq("user_id", user?.id)
        .csv();

      const blob = new Blob([data as string], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "analytics-export.csv";
      a.click();
      
      toast.success("Analytics exported successfully!");
    } catch (error) {
      toast.error("Failed to export analytics");
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tight">
              Analytics Hub
            </h1>
            <p className="text-muted-foreground mt-2">
              Deep insights into your content performance and growth
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={generateAIInsights} disabled={loading} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Generate AI Insights
            </Button>
            <Button variant="outline" onClick={exportAnalytics} className="gap-2">
              <Download className="h-4 w-4" />
              Export Data
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {profileStats?.profile_views?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                +12% from last week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Engagement</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {profileStats?.total_engagement?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {profileStats?.engagement_rate}% rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Followers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {profileStats?.followers_count?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                +8% growth this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {profileStats?.post_count?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Active creator
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="realtime" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="realtime" className="gap-2">
              <Activity className="h-4 w-4" />
              Live Stats
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-2">
              <Sparkles className="h-4 w-4" />
              AI Insights
            </TabsTrigger>
            <TabsTrigger value="viral" className="gap-2">
              <Share2 className="h-4 w-4" />
              Viral Map
            </TabsTrigger>
            <TabsTrigger value="audience" className="gap-2">
              <Users className="h-4 w-4" />
              Audience
            </TabsTrigger>
            <TabsTrigger value="achievements" className="gap-2">
              <Award className="h-4 w-4" />
              Milestones
            </TabsTrigger>
          </TabsList>

          <TabsContent value="realtime" className="space-y-4">
            <RealTimeStats />
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>AI-Powered Insights</CardTitle>
                <CardDescription>
                  Actionable recommendations based on your performance data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {insights.length === 0 ? (
                  <div className="text-center py-8">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">
                      No insights yet. Generate AI insights to get started!
                    </p>
                    <Button onClick={generateAIInsights} disabled={loading}>
                      Generate Insights
                    </Button>
                  </div>
                ) : (
                  insights.map((insight) => (
                    <Card key={insight.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{insight.insight_title}</CardTitle>
                            <Badge variant="outline" className="mt-2">
                              {insight.insight_type.replace("_", " ")}
                            </Badge>
                          </div>
                          <Badge variant="secondary">
                            {(insight.confidence_score * 100).toFixed(0)}% confidence
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">{insight.insight_content}</p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="viral" className="space-y-4">
            <ViralMapVisualization />
          </TabsContent>

          <TabsContent value="audience" className="space-y-4">
            <AudienceInsights />
          </TabsContent>

          <TabsContent value="achievements" className="space-y-4">
            <MilestonesGamification />
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Achievements</CardTitle>
                <CardDescription>
                  Badges you've earned recently
                </CardDescription>
              </CardHeader>
              <CardContent>
                {achievements.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No achievements yet. Keep posting to unlock rewards!
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {achievements.map((achievement) => (
                      <Card key={achievement.id}>
                        <CardHeader>
                          <div className="flex items-center gap-3">
                            <Award className="h-8 w-8 text-primary" />
                            <div>
                              <CardTitle className="text-base">
                                {achievement.achievement_name}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground">
                                {achievement.achievement_description}
                              </p>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Analytics;