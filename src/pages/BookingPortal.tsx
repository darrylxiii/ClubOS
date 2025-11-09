import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Video, Mail, Phone, User, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function BookingPortal() {
  const { bookingId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [booking, setBooking] = useState<any>(null);
  const [bookingLink, setBookingLink] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bookingId) {
      loadBooking();
    }
  }, [bookingId]);

  const loadBooking = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch booking with booking link details
      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .select(`
          *,
          booking_links (
            *,
            profiles:user_id (
              full_name,
              email,
              avatar_url
            )
          )
        `)
        .eq("id", bookingId)
        .single();

      if (bookingError) throw bookingError;
      if (!bookingData) throw new Error("Booking not found");

      setBooking(bookingData);
      setBookingLink(bookingData.booking_links);
    } catch (err: any) {
      console.error("Error loading booking:", err);
      setError(err.message || "Failed to load booking");
      toast.error("Failed to load booking details");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;

    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", bookingId);

      if (error) throw error;

      toast.success("Booking cancelled successfully");
      loadBooking();
    } catch (err: any) {
      console.error("Error cancelling booking:", err);
      toast.error("Failed to cancel booking");
    }
  };

  const handleJoinMeeting = () => {
    const meetingLink = booking.quantum_meeting_link || booking.video_meeting_link;
    if (meetingLink) {
      window.open(meetingLink, "_blank");
    }
  };

  const canJoinMeeting = () => {
    if (!booking || booking.status !== "confirmed") return false;
    
    const now = new Date();
    const meetingStart = new Date(booking.scheduled_start);
    const meetingEnd = new Date(booking.scheduled_end);
    
    // Allow joining 15 minutes before and up to meeting end time
    const joinWindowStart = new Date(meetingStart.getTime() - 15 * 60 * 1000);
    
    return now >= joinWindowStart && now <= meetingEnd;
  };

  const getTimeUntilMeeting = () => {
    if (!booking) return null;
    
    const now = new Date();
    const meetingStart = new Date(booking.scheduled_start);
    const diff = meetingStart.getTime() - now.getTime();
    
    if (diff < 0) return "Meeting has started";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `in ${days} day${days > 1 ? 's' : ''}`;
    }
    if (hours > 0) {
      return `in ${hours}h ${minutes}m`;
    }
    return `in ${minutes} minutes`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-background/50 flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-background/50 flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Booking Not Found</CardTitle>
            <CardDescription>
              This booking link is invalid or has expired.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const meetingLink = booking.quantum_meeting_link || booking.video_meeting_link;
  const hostProfile = bookingLink?.profiles;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/50 py-12 px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Status Badge */}
        <div className="flex justify-center">
          <Badge 
            variant={booking.status === "confirmed" ? "default" : "secondary"}
            className="text-sm px-4 py-1.5"
          >
            {booking.status === "confirmed" ? "✓ Confirmed" : 
             booking.status === "cancelled" ? "✗ Cancelled" : 
             booking.status.toUpperCase()}
          </Badge>
        </div>

        {/* Main Card */}
        <Card className="border-2">
          <CardHeader className="text-center space-y-4">
            <div>
              <CardTitle className="text-3xl mb-2">{bookingLink?.title}</CardTitle>
              <CardDescription className="text-base">
                {bookingLink?.description}
              </CardDescription>
            </div>

            {booking.status === "confirmed" && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <p className="text-sm font-medium text-primary">
                  {canJoinMeeting() ? "🟢 Ready to Join" : `⏰ ${getTimeUntilMeeting()}`}
                </p>
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Meeting Details */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">
                    {format(new Date(booking.scheduled_start), "EEEE, MMMM d, yyyy")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(booking.scheduled_start), "h:mm a")} - 
                    {format(new Date(booking.scheduled_end), "h:mm a")} ({booking.timezone})
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{bookingLink?.duration_minutes} minutes</p>
                </div>
              </div>

              {meetingLink && (
                <div className="flex items-start gap-3">
                  <Video className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium mb-1">
                      {booking.quantum_meeting_link ? "Quantum Club Meeting" : "Video Conference"}
                    </p>
                    <p className="text-sm text-muted-foreground break-all">
                      {meetingLink}
                    </p>
                  </div>
                </div>
              )}

              {hostProfile && (
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">{hostProfile.full_name}</p>
                    <p className="text-sm text-muted-foreground">{hostProfile.email}</p>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Guest Information */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase">Your Information</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{booking.guest_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{booking.guest_email}</span>
                </div>
                {booking.guest_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{booking.guest_phone}</span>
                  </div>
                )}
              </div>
            </div>

            {booking.notes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase">Your Notes</h3>
                  <p className="text-sm">{booking.notes}</p>
                </div>
              </>
            )}

            {/* Actions */}
            {booking.status === "confirmed" && (
              <>
                <Separator />
                <div className="space-y-3">
                  {meetingLink && (
                    <Button
                      onClick={handleJoinMeeting}
                      size="lg"
                      className="w-full"
                      disabled={!canJoinMeeting()}
                    >
                      <Video className="mr-2 h-5 w-5" />
                      {canJoinMeeting() ? "Join Meeting" : "Meeting Not Yet Available"}
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  )}

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => toast.info("Rescheduling feature coming soon")}
                    >
                      Reschedule
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleCancelBooking}
                    >
                      Cancel Booking
                    </Button>
                  </div>
                </div>
              </>
            )}

            {booking.status === "cancelled" && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-center">
                <p className="text-sm text-destructive font-medium">
                  This booking has been cancelled
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Support Card */}
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-center text-muted-foreground">
              Need help? Contact us at{" "}
              <a href="mailto:support@thequantumclub.nl" className="text-primary hover:underline">
                support@thequantumclub.nl
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
