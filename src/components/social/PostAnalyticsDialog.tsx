import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Heart, MessageCircle, Share2, Users, MapPin, Download, Bookmark } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TimeRangeSelector, TimeRange } from "@/components/analytics/TimeRangeSelector";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import { Progress } from "@/components/ui/progress";
import { PostViewers } from "@/components/analytics/PostViewers";

interface PostAnalyticsDialogProps {
  postId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PostAnalyticsDialog = ({ postId, open, onOpenChange }: PostAnalyticsDialogProps) => {
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [customRange, setCustomRange] = useState<{ from: Date; to: Date }>();
  const [post, setPost] = useState<any>(null);

  const analytics = useAnalyticsData(
    post?.user_id,
    timeRange,
    customRange,
    postId || undefined
  );

  useEffect(() => {
    if (postId && open) {
      fetchPost();
    }
  }, [postId, open]);

  const fetchPost = async () => {
    if (!postId) return;

    const { data } = await supabase
      .from("posts")
      .select("*")
      .eq("id", postId)
      .single();

    setPost(data);
  };

  const exportData = () => {
    const csvContent = [
      ["Metric", "Value"],
      ["Total Views", analytics.totalViews],
      ["Unique Views", analytics.uniqueViews],
      ["Likes", analytics.likes],
      ["Comments", analytics.comments],
      ["Shares", analytics.shares],
      ["Bookmarks", analytics.bookmarks],
      ["Engagement Rate", `${analytics.avgEngagementRate}%`],
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

        {/* Time Range Selector */}
        <TimeRangeSelector
          value={timeRange}
          customRange={customRange}
          onChange={(range, custom) => {
            setTimeRange(range);
            if (custom) setCustomRange(custom);
          }}
        />

        {analytics.loading ? (
          <div className="text-center py-8">Loading analytics...</div>
        ) : (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Bookmark className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="text-2xl font-bold">{analytics.bookmarks}</p>
                      <p className="text-xs text-muted-foreground">Bookmarks</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="viewers">Viewers</TabsTrigger>
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
                      <span className="text-sm text-muted-foreground">Engagement Rate</span>
                      <span className="font-semibold">{analytics.avgEngagementRate}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Interactions</span>
                      <span className="font-semibold">
                        {analytics.likes + analytics.comments + analytics.shares + analytics.bookmarks}
                      </span>
                    </div>
                    <Button onClick={exportData} variant="outline" className="w-full gap-2">
                      <Download className="h-4 w-4" />
                      Export Analytics
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="viewers" className="space-y-4">
                <PostViewers postId={postId || ""} />
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
                      {analytics.locationBreakdown.slice(0, 5).map((location: any) => (
                        <div key={location.location} className="mb-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span>{location.location}</span>
                            <span className="text-muted-foreground">
                              {location.count} ({((location.count / analytics.totalViews) * 100).toFixed(1)}%)
                            </span>
                          </div>
                          <Progress value={(location.count / analytics.totalViews) * 100} className="h-2" />
                        </div>
                      ))}
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Device Breakdown
                      </h4>
                      {analytics.deviceBreakdown.map((device: any) => (
                        <div key={device.device} className="flex justify-between items-center py-2">
                          <span className="text-sm capitalize">{device.device}</span>
                          <Badge variant="secondary">
                            {device.count} ({((device.count / analytics.totalViews) * 100).toFixed(1)}%)
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="interactions" className="space-y-4">
                <PostViewers postId={postId || ""} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};