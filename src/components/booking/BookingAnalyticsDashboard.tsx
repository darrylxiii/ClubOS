import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BookingConversionFunnel } from "@/components/booking/BookingConversionFunnel";

interface BookingStats {
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  noShows: number;
  avgBookingTime: number;
  conversionRate: number;
  topBookingDays: { day: string; count: number }[];
  topBookingTimes: { hour: string; count: number }[];
}

interface BookingAnalyticsDashboardProps {
  bookingLinkId?: string;
  userId: string;
  dateRange?: { start: Date; end: Date };
}

export function BookingAnalyticsDashboard({ bookingLinkId, userId, dateRange }: BookingAnalyticsDashboardProps) {
  const [stats, setStats] = useState<BookingStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [bookingLinkId, userId, dateRange]);

  const loadAnalytics = async () => {
    try {
      let query = supabase
        .from("bookings")
        .select("*")
        .eq("user_id", userId);

      if (bookingLinkId) {
        query = query.eq("booking_link_id", bookingLinkId);
      }

      if (dateRange) {
        query = query
          .gte("created_at", dateRange.start.toISOString())
          .lte("created_at", dateRange.end.toISOString());
      }

      const { data: bookings, error } = await query;

      if (error) throw error;

      // Calculate statistics
      const totalBookings = bookings?.length || 0;
      const confirmedBookings = bookings?.filter((b) => b.status === "confirmed").length || 0;
      const cancelledBookings = bookings?.filter((b) => b.status === "cancelled").length || 0;
      const noShows = bookings?.filter((b) => b.no_show === true).length || 0;

      // Calculate average booking time (time from creation to scheduled start)
      const avgBookingTime =
        bookings?.reduce((acc, b) => {
          const created = new Date(b.created_at).getTime();
          const scheduled = new Date(b.scheduled_start).getTime();
          return acc + (scheduled - created) / (1000 * 60 * 60 * 24); // days
        }, 0) / (bookings?.length || 1);

      // Calculate conversion rate (confirmed / total)
      const conversionRate = totalBookings > 0 ? (confirmedBookings / totalBookings) * 100 : 0;

      // Top booking days
      const dayCount: Record<string, number> = {};
      bookings?.forEach((b) => {
        const day = new Date(b.scheduled_start).toLocaleDateString("en-US", { weekday: "long" });
        dayCount[day] = (dayCount[day] || 0) + 1;
      });
      const topBookingDays = Object.entries(dayCount)
        .map(([day, count]) => ({ day, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      // Top booking times
      const hourCount: Record<string, number> = {};
      bookings?.forEach((b) => {
        const hour = new Date(b.scheduled_start).getHours();
        const hourStr = `${hour.toString().padStart(2, "0")}:00`;
        hourCount[hourStr] = (hourCount[hourStr] || 0) + 1;
      });
      const topBookingTimes = Object.entries(hourCount)
        .map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      setStats({
        totalBookings,
        confirmedBookings,
        cancelledBookings,
        noShows,
        avgBookingTime,
        conversionRate,
        topBookingDays,
        topBookingTimes,
      });
    } catch (error: any) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="py-8">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No analytics data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBookings}</div>
            <p className="text-xs text-muted-foreground">All time bookings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.confirmedBookings}</div>
            <p className="text-xs text-muted-foreground">
              {stats.conversionRate.toFixed(1)}% conversion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.cancelledBookings}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalBookings > 0
                ? ((stats.cancelledBookings / stats.totalBookings) * 100).toFixed(1)
                : 0}
              % cancellation rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Lead Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgBookingTime.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">days in advance</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Booking Days</CardTitle>
            <CardDescription>Most popular days of the week</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.topBookingDays.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="font-medium">{item.day}</span>
                <Badge variant="secondary">{item.count} bookings</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Booking Times</CardTitle>
            <CardDescription>Most popular hours of the day</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.topBookingTimes.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="font-medium">{item.hour}</span>
                <Badge variant="secondary">{item.count} bookings</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Conversion Funnel */}
      <BookingConversionFunnel bookingLinkId={bookingLinkId} />
    </div>
  );
}
