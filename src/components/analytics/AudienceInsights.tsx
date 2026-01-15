import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MapPin, Smartphone, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const AudienceInsights = () => {
  const { user } = useAuth();
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAudienceInsights();
    }
  }, [user]);

  const fetchAudienceInsights = async () => {
    try {
      const { data: userPosts } = await supabase
        .from("unified_posts")
        .select("id")
        .eq("user_id", user?.id ?? '');

      const postIds = userPosts?.map((p) => p.id) || [];

      if (postIds.length === 0) {
        setLoading(false);
        return;
      }

      // Get all views
      const { data: views } = await supabase
        .from("post_views")
        .select("*")
        .in("post_id", postIds);

      if (!views || views.length === 0) {
        setLoading(false);
        return;
      }

      // Aggregate data
      const countries = views.reduce((acc: any, v) => {
        const country = v.country || "Unknown";
        acc[country] = (acc[country] || 0) + 1;
        return acc;
      }, {});

      const devices = views.reduce((acc: any, v) => {
        const device = v.device_type || "Unknown";
        acc[device] = (acc[device] || 0) + 1;
        return acc;
      }, {});

      const hours = views.reduce((acc: any, v) => {
        const hour = new Date(v.viewed_at).getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {});

      const uniqueViewers = new Set(views.filter((v) => v.user_id).map((v) => v.user_id)).size;
      const returningViewers = views.filter((v) => !v.is_unique_view).length;
      const newViewers = views.filter((v) => v.is_unique_view).length;

      // Find peak hours
      const peakHour = Object.entries(hours).sort(([, a]: any, [, b]: any) => b - a)[0];

      setInsights({
        countries,
        devices,
        peakHour: peakHour ? `${peakHour[0]}:00` : "N/A",
        uniqueViewers,
        returningRate: totalViews > 0 ? ((returningViewers / totalViews) * 100).toFixed(1) : 0,
        newViewers,
        totalViews: views.length,
      });
    } catch (error) {
      console.error("Error fetching audience insights:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading audience insights...</p>
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audience Insights</CardTitle>
          <CardDescription>Understand who's viewing your content</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Not enough data yet. Keep posting to build insights!
          </p>
        </CardContent>
      </Card>
    );
  }

  const topCountries = Object.entries(insights.countries)
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, 5);

  const totalViews = insights.totalViews;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audience Insights</CardTitle>
        <CardDescription>Deep dive into your audience demographics</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Viewer Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{insights.uniqueViewers}</p>
            <p className="text-xs text-muted-foreground">Unique Viewers</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{insights.newViewers}</p>
            <p className="text-xs text-muted-foreground">New Viewers</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{insights.returningRate}%</p>
            <p className="text-xs text-muted-foreground">Returning Rate</p>
          </div>
        </div>

        {/* Top Locations */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Top Locations
          </h4>
          <div className="space-y-3">
            {topCountries.map(([country, count]: any) => (
              <div key={country}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{country}</span>
                  <span className="text-muted-foreground">
                    {count} ({((count / totalViews) * 100).toFixed(1)}%)
                  </span>
                </div>
                <Progress value={(count / totalViews) * 100} className="h-2" />
              </div>
            ))}
          </div>
        </div>

        {/* Device Breakdown */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Device Types
          </h4>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(insights.devices).map(([device, count]: any) => (
              <Badge key={device} variant="secondary">
                {device}: {count} ({((count / totalViews) * 100).toFixed(1)}%)
              </Badge>
            ))}
          </div>
        </div>

        {/* Peak Activity */}
        <div className="bg-accent/50 rounded-lg p-4">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Peak Activity Time
          </h4>
          <p className="text-2xl font-bold text-primary">{insights.peakHour}</p>
          <p className="text-sm text-muted-foreground">Best time to post for maximum reach</p>
        </div>
      </CardContent>
    </Card>
  );
};