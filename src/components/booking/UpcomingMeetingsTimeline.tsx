import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Video, Calendar, Clock, User, ExternalLink, Copy, CheckCircle2 } from "lucide-react";
import { format, isToday, isTomorrow, isPast, isFuture, isWithinInterval, addMinutes } from "date-fns";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

export function UpcomingMeetingsTimeline() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (user) {
      loadUpcomingBookings();
      
      // Update current time every minute
      const interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Subscribe to realtime booking updates
    const channel = supabase
      .channel('upcoming-bookings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadUpcomingBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadUpcomingBookings = async () => {
    try {
      setLoading(true);
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          booking_links (
            title,
            duration_minutes,
            color
          )
        `)
        .eq("user_id", user?.id)
        .eq("status", "confirmed")
        .gte("scheduled_end", now)
        .order("scheduled_start", { ascending: true })
        .limit(10);

      if (error) throw error;
      setBookings(data || []);
    } catch (error: any) {
      console.error("Error loading bookings:", error);
      toast.error("Failed to load upcoming meetings");
    } finally {
      setLoading(false);
    }
  };

  const canJoinMeeting = (booking: any) => {
    const start = new Date(booking.scheduled_start);
    const end = new Date(booking.scheduled_end);
    const joinWindow = addMinutes(start, -15); // 15 min before
    
    return isWithinInterval(currentTime, { start: joinWindow, end });
  };

  const getTimeStatus = (booking: any) => {
    const start = new Date(booking.scheduled_start);
    const end = new Date(booking.scheduled_end);
    const now = currentTime;

    if (isWithinInterval(now, { start, end })) {
      return { label: "🔴 In Progress", color: "destructive" };
    }

    if (isPast(end)) {
      return { label: "✓ Completed", color: "secondary" };
    }

    const minutesUntil = Math.round((start.getTime() - now.getTime()) / (1000 * 60));
    
    if (minutesUntil <= 15) {
      return { label: `🟢 Starting in ${minutesUntil}m`, color: "default" };
    }

    if (minutesUntil <= 60) {
      return { label: `⏰ In ${minutesUntil}m`, color: "secondary" };
    }

    if (isToday(start)) {
      return { label: "📅 Today", color: "secondary" };
    }

    if (isTomorrow(start)) {
      return { label: "📅 Tomorrow", color: "outline" };
    }

    return { label: format(start, "MMM d"), color: "outline" };
  };

  const handleJoinMeeting = (booking: any) => {
    const meetingLink = booking.quantum_meeting_link || booking.video_meeting_link;
    if (meetingLink) {
      window.open(meetingLink, "_blank");
      toast.success("Opening meeting...");
    } else {
      toast.error("No meeting link available");
    }
  };

  const copyGuestPortalLink = (bookingId: string) => {
    const portalLink = `${window.location.origin}/booking/${bookingId}`;
    navigator.clipboard.writeText(portalLink);
    toast.success("Guest portal link copied!");
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const todayBookings = bookings.filter(b => isToday(new Date(b.scheduled_start)));
  const upcomingBookings = bookings.filter(b => isFuture(new Date(b.scheduled_start)) && !isToday(new Date(b.scheduled_start)));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Today's Schedule
        </CardTitle>
        <CardDescription>
          {todayBookings.length === 0 
            ? "No meetings scheduled for today" 
            : `${todayBookings.length} meeting${todayBookings.length > 1 ? 's' : ''} scheduled`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Today's Meetings */}
        {todayBookings.length > 0 && (
          <div className="space-y-3">
            {todayBookings.map((booking) => {
              const status = getTimeStatus(booking);
              const canJoin = canJoinMeeting(booking);
              const meetingLink = booking.quantum_meeting_link || booking.video_meeting_link;

              return (
                <div
                  key={booking.id}
                  className="border rounded-lg p-4 space-y-3 hover:border-primary/50 transition-colors"
                  style={{ borderLeftWidth: '4px', borderLeftColor: booking.booking_links?.color || '#6366f1' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{booking.booking_links?.title}</h4>
                        <Badge variant={status.color as any}>{status.label}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {format(new Date(booking.scheduled_start), "h:mm a")} - 
                          {format(new Date(booking.scheduled_end), "h:mm a")}
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {booking.guest_name}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {meetingLink && (
                        <Button
                          size="sm"
                          onClick={() => handleJoinMeeting(booking)}
                          disabled={!canJoin}
                          className="gap-2"
                        >
                          <Video className="h-4 w-4" />
                          {canJoin ? "Join" : "Soon"}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyGuestPortalLink(booking.id)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Upcoming Meetings */}
        {upcomingBookings.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground">Upcoming</h4>
              {upcomingBookings.slice(0, 5).map((booking) => {
                const status = getTimeStatus(booking);

                return (
                  <div
                    key={booking.id}
                    className="border rounded-lg p-3 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{booking.booking_links?.title}</p>
                          <Badge variant="outline" className="text-xs">{status.label}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{format(new Date(booking.scheduled_start), "MMM d, h:mm a")}</span>
                          <span>•</span>
                          <span>{booking.guest_name}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {bookings.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No upcoming meetings</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
