import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TimeRange } from "@/components/analytics/TimeRangeSelector";
import { subHours, subDays, subMonths, startOfDay, startOfYesterday, endOfYesterday } from "date-fns";

export interface AnalyticsData {
  totalViews: number;
  uniqueViews: number;
  likes: number;
  comments: number;
  shares: number;
  bookmarks: number;
  avgEngagementRate: number;
  topPosts: any[];
  viewsByHour: { hour: string; views: number }[];
  deviceBreakdown: { device: string; count: number }[];
  locationBreakdown: { location: string; count: number }[];
  loading: boolean;
}

export const useAnalyticsData = (
  userId: string | undefined,
  timeRange: TimeRange,
  customRange?: { from: Date; to: Date },
  postId?: string
) => {
  const [data, setData] = useState<AnalyticsData>({
    totalViews: 0,
    uniqueViews: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    bookmarks: 0,
    avgEngagementRate: 0,
    topPosts: [],
    viewsByHour: [],
    deviceBreakdown: [],
    locationBreakdown: [],
    loading: true,
  });

  useEffect(() => {
    if (!userId) return;
    fetchAnalytics();
  }, [userId, timeRange, customRange, postId]);

  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (timeRange) {
      case "1h":
        startDate = subHours(now, 1);
        break;
      case "3h":
        startDate = subHours(now, 3);
        break;
      case "12h":
        startDate = subHours(now, 12);
        break;
      case "today":
        startDate = startOfDay(now);
        break;
      case "yesterday":
        startDate = startOfYesterday();
        endDate = endOfYesterday();
        break;
      case "3d":
        startDate = subDays(now, 3);
        break;
      case "7d":
        startDate = subDays(now, 7);
        break;
      case "14d":
        startDate = subDays(now, 14);
        break;
      case "30d":
        startDate = subDays(now, 30);
        break;
      case "3m":
        startDate = subMonths(now, 3);
        break;
      case "6m":
        startDate = subMonths(now, 6);
        break;
      case "12m":
        startDate = subMonths(now, 12);
        break;
      case "custom":
        if (!customRange) return { startDate: subDays(now, 7), endDate: now };
        startDate = customRange.from;
        endDate = customRange.to;
        break;
      default:
        startDate = subDays(now, 7);
    }

    return { startDate, endDate };
  };

  const fetchAnalytics = async () => {
    setData((prev) => ({ ...prev, loading: true }));

    try {
      const { startDate, endDate } = getDateRange();

      // Get user's posts or specific post
      let postsQuery = supabase.from("unified_posts").select("id, content, created_at");

      if (postId) {
        postsQuery = postsQuery.eq("id", postId);
      } else {
        postsQuery = postsQuery.eq("user_id", userId);
      }

      const { data: posts } = await postsQuery;
      const postIds = posts?.map((p) => p.id) || [];

      if (postIds.length === 0) {
        setData((prev) => ({ ...prev, loading: false }));
        return;
      }

      // Fetch views
      const { data: views } = await supabase
        .from("post_views")
        .select("*")
        .in("post_id", postIds)
        .gte("viewed_at", startDate.toISOString())
        .lte("viewed_at", endDate.toISOString());

      // Fetch interactions
      const { data: interactions } = await supabase
        .from("post_interactions")
        .select("*")
        .in("post_id", postIds)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      // Calculate metrics
      const totalViews = views?.length || 0;
      const uniqueViews = views?.filter((v) => v.is_unique_view).length || 0;
      const likes = interactions?.filter((i) => i.interaction_type === "like").length || 0;
      const comments = interactions?.filter((i) => i.interaction_type === "comment").length || 0;
      const shares = interactions?.filter((i) => i.interaction_type === "share").length || 0;
      const bookmarks = interactions?.filter((i) => i.interaction_type === "bookmark").length || 0;

      const totalInteractions = likes + comments + shares + bookmarks;
      const avgEngagementRate = totalViews > 0 ? (totalInteractions / totalViews) * 100 : 0;

      // Views by hour
      const viewsByHour = views?.reduce((acc: any, v) => {
        const hour = new Date(v.viewed_at).getHours();
        const key = `${hour}:00`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      const viewsByHourArray = Object.entries(viewsByHour || {}).map(([hour, views]) => ({
        hour,
        views: views as number,
      }));

      // Device breakdown
      const deviceCounts = views?.reduce((acc: any, v) => {
        const device = v.device_type || "Unknown";
        acc[device] = (acc[device] || 0) + 1;
        return acc;
      }, {});

      const deviceBreakdown = Object.entries(deviceCounts || {}).map(([device, count]) => ({
        device,
        count: count as number,
      }));

      // Location breakdown
      const locationCounts = views?.reduce((acc: any, v) => {
        const location = v.country || "Unknown";
        acc[location] = (acc[location] || 0) + 1;
        return acc;
      }, {});

      const locationBreakdown = Object.entries(locationCounts || {})
        .map(([location, count]) => ({
          location,
          count: count as number,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Top posts (if viewing all posts)
      let topPosts: any[] = [];
      if (!postId && posts) {
        const postMetrics = await Promise.all(
          posts.map(async (post) => {
            const postViews = views?.filter((v) => v.post_id === post.id).length || 0;
            const postInteractions =
              interactions?.filter((i) => i.post_id === post.id).length || 0;
            return {
              ...post,
              views: postViews,
              engagement: postInteractions,
              score: postViews + postInteractions * 2,
            };
          })
        );
        topPosts = postMetrics.sort((a, b) => b.score - a.score).slice(0, 5);
      }

      setData({
        totalViews,
        uniqueViews,
        likes,
        comments,
        shares,
        bookmarks,
        avgEngagementRate: Number(avgEngagementRate.toFixed(2)),
        topPosts,
        viewsByHour: viewsByHourArray,
        deviceBreakdown,
        locationBreakdown,
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      setData((prev) => ({ ...prev, loading: false }));
    }
  };

  return data;
};