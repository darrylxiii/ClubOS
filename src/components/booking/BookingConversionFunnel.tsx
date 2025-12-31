import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingDown, TrendingUp, Users, Eye, Calendar, CheckCircle } from "lucide-react";

interface FunnelStage {
  name: string;
  count: number;
  percentage: number;
  dropoff: number;
  icon: React.ElementType;
}

interface BookingConversionFunnelProps {
  bookingLinkId?: string;
  dateRange?: { start: string; end: string };
}

export function BookingConversionFunnel({ bookingLinkId, dateRange }: BookingConversionFunnelProps) {
  const { data: funnelData, isLoading } = useQuery({
    queryKey: ["booking-funnel", bookingLinkId, dateRange],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get funnel events
      let query = supabase
        .from("booking_funnel_events")
        .select("event_type, booking_link_id, created_at");

      if (bookingLinkId) {
        query = query.eq("booking_link_id", bookingLinkId);
      }

      if (dateRange?.start) {
        query = query.gte("created_at", dateRange.start);
      }
      if (dateRange?.end) {
        query = query.lte("created_at", dateRange.end);
      }

      const { data: events, error } = await query;
      if (error) throw error;

      // Aggregate by event type
      const eventCounts: Record<string, number> = {};
      (events || []).forEach((event) => {
        eventCounts[event.event_type] = (eventCounts[event.event_type] || 0) + 1;
      });

      // Also get actual booking data
      let bookingQuery = supabase
        .from("bookings")
        .select("id, status, created_at")
        .eq("user_id", user.id);

      if (bookingLinkId) {
        bookingQuery = bookingQuery.eq("booking_link_id", bookingLinkId);
      }

      if (dateRange?.start) {
        bookingQuery = bookingQuery.gte("created_at", dateRange.start);
      }
      if (dateRange?.end) {
        bookingQuery = bookingQuery.lte("created_at", dateRange.end);
      }

      const { data: bookings } = await bookingQuery;

      const confirmedBookings = bookings?.filter(b => b.status === "confirmed").length || 0;
      const totalBookings = bookings?.length || 0;

      return {
        pageViews: eventCounts["page_view"] || 0,
        slotViews: eventCounts["slots_viewed"] || 0,
        slotSelected: eventCounts["slot_selected"] || 0,
        formStarted: eventCounts["form_started"] || 0,
        formCompleted: eventCounts["form_completed"] || 0,
        bookingsCreated: totalBookings,
        bookingsConfirmed: confirmedBookings,
      };
    },
    enabled: true,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const baseCount = Math.max(funnelData?.pageViews || 1, 1);
  
  const stages: FunnelStage[] = [
    {
      name: "Page Views",
      count: funnelData?.pageViews || 0,
      percentage: 100,
      dropoff: 0,
      icon: Eye,
    },
    {
      name: "Viewed Available Slots",
      count: funnelData?.slotViews || 0,
      percentage: ((funnelData?.slotViews || 0) / baseCount) * 100,
      dropoff: baseCount - (funnelData?.slotViews || 0),
      icon: Calendar,
    },
    {
      name: "Selected a Time",
      count: funnelData?.slotSelected || 0,
      percentage: ((funnelData?.slotSelected || 0) / baseCount) * 100,
      dropoff: (funnelData?.slotViews || 0) - (funnelData?.slotSelected || 0),
      icon: Calendar,
    },
    {
      name: "Started Form",
      count: funnelData?.formStarted || 0,
      percentage: ((funnelData?.formStarted || 0) / baseCount) * 100,
      dropoff: (funnelData?.slotSelected || 0) - (funnelData?.formStarted || 0),
      icon: Users,
    },
    {
      name: "Confirmed Booking",
      count: funnelData?.bookingsConfirmed || 0,
      percentage: ((funnelData?.bookingsConfirmed || 0) / baseCount) * 100,
      dropoff: (funnelData?.formStarted || 0) - (funnelData?.bookingsConfirmed || 0),
      icon: CheckCircle,
    },
  ];

  const overallConversion = baseCount > 0 
    ? ((funnelData?.bookingsConfirmed || 0) / baseCount) * 100 
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Conversion Funnel</span>
          <span className="text-sm font-normal text-muted-foreground">
            Overall: {overallConversion.toFixed(1)}%
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stages.map((stage, index) => {
          const StageIcon = stage.icon;
          const prevStage = index > 0 ? stages[index - 1] : null;
          const dropoffRate = prevStage && prevStage.count > 0
            ? ((prevStage.count - stage.count) / prevStage.count) * 100
            : 0;

          return (
            <div key={stage.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StageIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{stage.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">{stage.count}</span>
                  {index > 0 && dropoffRate > 0 && (
                    <span className="flex items-center text-xs text-destructive">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      -{dropoffRate.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
              <Progress 
                value={stage.percentage} 
                className="h-2"
              />
            </div>
          );
        })}

        {baseCount === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No funnel data available yet. Share your booking link to start tracking conversions.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
