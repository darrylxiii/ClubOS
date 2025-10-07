import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Heart, MessageCircle, Share2, TrendingUp, Users, MapPin, Clock, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PostAnalyticsDialogProps {
  postId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PostAnalyticsDialog = ({ postId, open, onOpenChange }: PostAnalyticsDialogProps) => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [views, setViews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (postId && open) {
      fetchPostAnalytics();
    }
  }, [postId, open]);

  const fetchPostAnalytics = async () => {
    if (!postId) return;

    setLoading(true);
    try {
      // Fetch post analytics
      const { data: postData } = await supabase
        .from("unified_posts")
        .select("*")
        .eq("id", postId)
        .single();

      // Fetch interactions
      const { data: interactionsData } = await supabase
        .from("post_interactions")
        .select("*, profiles(*)")
        .eq("post_id", postId)
        .order("created_at", { ascending: false });

      // Fetch views
      const { data: viewsData } = await supabase
        .from("post_views")
        .select("*")
        .eq("post_id", postId);

      // Aggregate view data
      const uniqueViews = viewsData?.filter((v) => v.is_unique_view).length || 0;
      const totalViews = viewsData?.length || 0;
      const avgDuration = viewsData?.reduce((sum, v) => sum + (v.view_duration_seconds || 0), 0) / (viewsData?.length || 1);

      // Location breakdown
      const locationCounts = viewsData?.reduce((acc: any, v) => {
        const loc = v.country || "Unknown";
        acc[loc] = (acc[loc] || 0) + 1;
        return acc;
      }, {});

      // Device breakdown
      const deviceCounts = viewsData?.reduce((acc: any, v) => {
        const device = v.device_type || "Unknown";
        acc[device] = (acc[device] || 0) + 1;
        return acc;
      }, {});

      setAnalytics({
        post: postData,
        uniqueViews,
        totalViews,
        avgDuration: Math.round(avgDuration),
        likes: interactionsData?.filter((i) => i.interaction_type === "like").length || 0,
        comments: interactionsData?.filter((i) => i.interaction_type === "comment").length || 0,
        shares: interactionsData?.filter((i) => i.interaction_type === "share").length || 0,
        locations: locationCounts,
        devices: deviceCounts,
      });

      setInteractions(interactionsData || []);
      setViews(viewsData || []);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    const csvContent = [
      ["Metric", "Value"],
      ["Total Views", analytics.totalViews],
      ["Unique Views", analytics.uniqueViews],
      ["Avg Duration (s)", analytics.avgDuration],
      ["Likes", analytics.likes],
      ["Comments", analytics.comments],
      ["Shares", analytics.shares],
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `post-analytics-${postId}.csv`;
    a.click();
    toast.success("Analytics exported!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Post Analytics</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">Loading analytics...</div>
        ) : analytics ? (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Eye className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{analytics.uniqueViews}</p>
                      <p className="text-xs text-muted-foreground">Unique Views</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Heart className="h-5 w-5 text-red-500" />
                    <div>
                      <p className="text-2xl font-bold">{analytics.likes}</p>
                      <p className="text-xs text-muted-foreground">Likes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-2xl font-bold">{analytics.comments}</p>
                      <p className="text-xs text-muted-foreground">Comments</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Share2 className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold">{analytics.shares}</p>
                      <p className="text-xs text-muted-foreground">Shares</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="audience">Audience</TabsTrigger>
                <TabsTrigger value="interactions">Interactions</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Summary</CardTitle>
                    <CardDescription>Key metrics for this post</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Views</span>
                      <span className="font-semibold">{analytics.totalViews}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Avg. View Duration</span>
                      <span className="font-semibold">{analytics.avgDuration}s</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Engagement Rate</span>
                      <span className="font-semibold">
                        {analytics.totalViews > 0
                          ? ((analytics.likes + analytics.comments + analytics.shares) / analytics.totalViews * 100).toFixed(1)
                          : 0}%
                      </span>
                    </div>
                    <Button onClick={exportData} variant="outline" className="w-full gap-2">
                      <Download className="h-4 w-4" />
                      Export Analytics
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="audience" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Audience Insights</CardTitle>
                    <CardDescription>Where your audience is coming from</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Top Locations
                      </h4>
                      {Object.entries(analytics.locations || {})
                        .sort(([, a]: any, [, b]: any) => b - a)
                        .slice(0, 5)
                        .map(([location, count]: any) => (
                          <div key={location} className="flex justify-between items-center py-2">
                            <span className="text-sm">{location}</span>
                            <Badge variant="secondary">{count} views</Badge>
                          </div>
                        ))}
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Device Breakdown
                      </h4>
                      {Object.entries(analytics.devices || {}).map(([device, count]: any) => (
                        <div key={device} className="flex justify-between items-center py-2">
                          <span className="text-sm capitalize">{device}</span>
                          <Badge variant="secondary">{count} views</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="interactions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Interactions</CardTitle>
                    <CardDescription>Who's engaging with your post</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {interactions.slice(0, 10).map((interaction) => (
                        <div key={interaction.id} className="flex items-center justify-between py-2 border-b">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">{interaction.interaction_type}</Badge>
                            <span className="text-sm">
                              {interaction.profiles?.full_name || "Anonymous"}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(interaction.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                      {interactions.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                          No interactions yet
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};