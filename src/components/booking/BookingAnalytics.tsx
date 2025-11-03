import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Calendar, Users, TrendingUp, Clock } from "lucide-react";

interface BookingStats {
  total_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  no_shows: number;
  completion_rate: number;
  avg_duration: number;
}

interface BookingAnalyticsProps {
  bookingLinkId: string;
  dateRange?: { start: Date; end: Date };
}

export function BookingAnalytics({ bookingLinkId, dateRange }: BookingAnalyticsProps) {
  const [stats, setStats] = useState<BookingStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [bookingLinkId, dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("bookings")
        .select("*")
        .eq("booking_link_id", bookingLinkId);

      if (dateRange) {
        query = query
          .gte("scheduled_start", dateRange.start.toISOString())
          .lte("scheduled_start", dateRange.end.toISOString());
      }

      const { data: bookings, error } = await query;

      if (error) throw error;

      const total = bookings?.length || 0;
      const completed = bookings?.filter(b => b.attended)?.length || 0;
      const cancelled = bookings?.filter(b => b.status === "cancelled")?.length || 0;
      const noShows = bookings?.filter(b => b.no_show)?.length || 0;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      // Calculate average duration from booking link
      const { data: linkData } = await supabase
        .from("booking_links")
        .select("duration_minutes")
        .eq("id", bookingLinkId)
        .single();

      setStats({
        total_bookings: total,
        completed_bookings: completed,
        cancelled_bookings: cancelled,
        no_shows: noShows,
        completion_rate: completionRate,
        avg_duration: linkData?.duration_minutes || 0,
      });
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-4 bg-muted rounded w-20 mb-2" />
            <div className="h-8 bg-muted rounded w-16" />
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      icon: Calendar,
      label: "Total Bookings",
      value: stats.total_bookings,
      color: "text-blue-600",
    },
    {
      icon: Users,
      label: "Completed",
      value: stats.completed_bookings,
      color: "text-green-600",
    },
    {
      icon: TrendingUp,
      label: "Completion Rate",
      value: `${stats.completion_rate}%`,
      color: "text-amber-600",
    },
    {
      icon: Clock,
      label: "Avg Duration",
      value: `${stats.avg_duration}m`,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-bold mt-2">{stat.value}</p>
              </div>
              <Icon className={`h-8 w-8 ${stat.color}`} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}
