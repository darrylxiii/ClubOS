import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { safeFormatTime } from "@/lib/safeTimeFormat";
import { 
  Calendar, 
  Clock, 
  User, 
  Video, 
  Mail, 
  MapPin, 
  CalendarX, 
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink
} from "lucide-react";
import { TimezoneWarning } from "@/components/booking/TimezoneWarning";

interface BookingDetails {
  id: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  notes?: string;
  guest_timezone?: string;
  quantum_meeting_link?: string;
  video_meeting_link?: string;
  google_meet_hangout_link?: string;
  booking_links?: {
    id: string;
    slug: string;
    title: string;
    duration_minutes: number;
    color: string;
    user_id: string;
    advance_booking_days: number;
    min_notice_hours: number;
  };
  profiles?: {
    full_name: string;
    avatar_url?: string;
    timezone?: string;
  };
}

export default function GuestBookingPage() {
  const { bookingId } = useParams();
  const [searchParams] = useSearchParams();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReschedule, setShowReschedule] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const guestTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    if (bookingId) {
      loadBooking();
    }
  }, [bookingId]);

  const loadBooking = async () => {
    if (!bookingId) return;
    
    setLoading(true);
    try {
      // First get the booking
      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .select(`
          *,
          booking_links (
            id, slug, title, duration_minutes, color, user_id, 
            advance_booking_days, min_notice_hours
          )
        `)
        .eq("id", bookingId)
        .single();

      if (bookingError) throw bookingError;

      // Then get the profile separately with work_timezone
      if (bookingData?.user_id) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, work_timezone")
          .eq("id", bookingData.user_id)
          .single();

        setBooking({
          ...bookingData,
          profiles: profileData ? {
            ...profileData,
            timezone: profileData.work_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          } : undefined,
        } as BookingDetails);
      } else {
        setBooking(bookingData as BookingDetails);
      }
    } catch (error: unknown) {
      console.error("Error loading booking:", error);
      toast.error("Could not find this booking");
    } finally {
      setLoading(false);
    }
  };

  const getMeetingLink = (): string | undefined => {
    if (!booking) return undefined;
    return booking.quantum_meeting_link || 
           booking.google_meet_hangout_link || 
           booking.video_meeting_link;
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error("Please provide a cancellation reason");
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase.functions.invoke("cancel-booking", {
        body: {
          bookingId: booking?.id,
          reason: cancelReason.trim(),
        },
      });

      if (error) throw error;

      toast.success("Booking cancelled successfully");
      setShowCancel(false);
      loadBooking();
    } catch (error: unknown) {
      console.error("Cancel error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to cancel booking");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" /> Confirmed</Badge>;
      case "cancelled":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Cancelled</Badge>;
      case "completed":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</Badge>;
      case "pending":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CalendarX className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Booking Not Found</h2>
            <p className="text-muted-foreground">
              This booking may have been cancelled or the link is invalid.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hostTimezone = booking.profiles?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const meetingLink = getMeetingLink();
  const isPast = new Date(booking.scheduled_start) < new Date();
  const canModify = booking.status === "confirmed" && !isPast;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Your Booking Details
          </h1>
          <p className="text-muted-foreground">
            Manage your meeting with {booking.profiles?.full_name || "the host"}
          </p>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{booking.booking_links?.title || "Meeting"}</CardTitle>
              {getStatusBadge(booking.status)}
            </div>
            <CardDescription>
              {booking.booking_links?.duration_minutes} minute meeting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Date & Time */}
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">
                  {format(parseISO(booking.scheduled_start), "EEEE, MMMM d, yyyy")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {safeFormatTime(booking.scheduled_start, guestTimezone, '12h')} – 
                  {safeFormatTime(booking.scheduled_end, guestTimezone, '12h')}
                  <span className="ml-1">({guestTimezone.replace(/_/g, " ")})</span>
                </p>
              </div>
            </div>

            {/* Timezone Warning */}
            <TimezoneWarning 
              guestTimezone={guestTimezone} 
              hostTimezone={hostTimezone} 
            />

            <Separator />

            {/* Host */}
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">Host</p>
                <p className="text-sm text-muted-foreground">
                  {booking.profiles?.full_name || "Meeting Host"}
                </p>
              </div>
            </div>

            {/* Guest Info */}
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">{booking.guest_name}</p>
                <p className="text-sm text-muted-foreground">{booking.guest_email}</p>
              </div>
            </div>

            {/* Meeting Link */}
            {meetingLink && booking.status === "confirmed" && (
              <>
                <Separator />
                <div className="flex items-center gap-3">
                  <Video className="w-5 h-5 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">Video Meeting</p>
                    <a 
                      href={meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Join Meeting <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </>
            )}

            {/* Notes */}
            {booking.notes && (
              <>
                <Separator />
                <div>
                  <p className="font-medium mb-1">Notes</p>
                  <p className="text-sm text-muted-foreground">{booking.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        {canModify && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Manage Booking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!showCancel ? (
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      // Navigate to reschedule flow
                      window.location.href = `/book/${booking.booking_links?.slug}?reschedule=${booking.id}`;
                    }}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reschedule
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
                    onClick={() => setShowCancel(true)}
                  >
                    <CalendarX className="w-4 h-4 mr-2" />
                    Cancel Booking
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Please provide a reason for cancelling:
                  </p>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Reason for cancellation..."
                    className="w-full min-h-[80px] p-3 rounded-md border border-input bg-background text-sm"
                  />
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => {
                        setShowCancel(false);
                        setCancelReason("");
                      }}
                      disabled={actionLoading}
                    >
                      Keep Booking
                    </Button>
                    <Button 
                      variant="default"
                      className="flex-1 bg-destructive hover:bg-destructive/90"
                      onClick={handleCancel}
                      disabled={actionLoading}
                    >
                      {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Confirm Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Cancelled State */}
        {booking.status === "cancelled" && (
          <Card className="border-destructive/50">
            <CardContent className="pt-6 text-center">
              <XCircle className="w-12 h-12 mx-auto text-destructive mb-3" />
              <h3 className="font-semibold mb-1">This booking has been cancelled</h3>
              <p className="text-sm text-muted-foreground">
                Need to book again?{" "}
                <a 
                  href={`/book/${booking.booking_links?.slug}`}
                  className="text-primary hover:underline"
                >
                  Schedule a new meeting
                </a>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Past Booking */}
        {isPast && booking.status === "confirmed" && (
          <Card className="border-muted">
            <CardContent className="pt-6 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-semibold mb-1">This meeting has passed</h3>
              <p className="text-sm text-muted-foreground">
                Want to schedule another meeting?{" "}
                <a 
                  href={`/book/${booking.booking_links?.slug}`}
                  className="text-primary hover:underline"
                >
                  Book again
                </a>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Powered by The Quantum Club
        </p>
      </div>
    </div>
  );
}
