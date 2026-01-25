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
  CalendarX, 
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  UserPlus,
  Clock3,
  Shield
} from "lucide-react";
import { TimezoneWarning } from "@/components/booking/TimezoneWarning";
import { ProposeTimeDialog } from "@/components/booking/ProposeTimeDialog";
import { CancelBookingDialog } from "@/components/booking/CancelBookingDialog";

interface GuestPermissions {
  can_cancel: boolean;
  can_reschedule: boolean;
  can_propose_times: boolean;
  can_add_attendees: boolean;
}

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

interface GuestRecord {
  id: string;
  email: string;
  name?: string;
  can_cancel: boolean;
  can_reschedule: boolean;
  can_propose_times: boolean;
  can_add_attendees: boolean;
}

export default function GuestBookingPortal() {
  const { bookingId, accessToken } = useParams();
  const [searchParams] = useSearchParams();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [guestRecord, setGuestRecord] = useState<GuestRecord | null>(null);
  const [permissions, setPermissions] = useState<GuestPermissions>({
    can_cancel: false,
    can_reschedule: false,
    can_propose_times: false,
    can_add_attendees: false,
  });
  const [loading, setLoading] = useState(true);
  const [showProposeTime, setShowProposeTime] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const guestTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const initialAction = searchParams.get('action');

  useEffect(() => {
    if (bookingId) {
      loadBookingAndValidateAccess();
    }
  }, [bookingId, accessToken]);

  useEffect(() => {
    // Open dialogs based on URL action parameter
    if (initialAction && !loading) {
      if (initialAction === 'propose' && permissions.can_propose_times) {
        setShowProposeTime(true);
      } else if (initialAction === 'cancel' && permissions.can_cancel) {
        setShowCancel(true);
      }
    }
  }, [initialAction, loading, permissions]);

  const loadBookingAndValidateAccess = async () => {
    if (!bookingId) return;
    
    setLoading(true);
    try {
      // If we have an access token, use the edge function for secure access
      if (accessToken) {
        const { data, error } = await supabase.functions.invoke("guest-booking-actions", {
          body: {
            action: 'get_details',
            accessToken,
            bookingId,
          },
        });

        if (error) throw error;

        if (data?.success) {
          // Transform booking data to match expected format
          const bookingData = data.booking;
          setBooking({
            id: bookingData.id,
            guest_name: bookingData.guest_name,
            guest_email: bookingData.guest_email,
            guest_phone: bookingData.guest_phone,
            scheduled_start: bookingData.scheduled_start,
            scheduled_end: bookingData.scheduled_end,
            status: bookingData.status,
            notes: bookingData.notes,
            quantum_meeting_link: bookingData.quantum_meeting_link,
            video_meeting_link: bookingData.video_meeting_link,
            google_meet_hangout_link: bookingData.google_meet_hangout_link,
            booking_links: bookingData.booking_links,
            profiles: bookingData.host ? {
              full_name: bookingData.host.full_name,
              avatar_url: bookingData.host.avatar_url,
              timezone: guestTimezone,
            } : undefined,
          });

          // Set guest record from viewer info
          const viewerGuest = bookingData.guests?.find((g: any) => 
            g.email.toLowerCase() === data.viewer.email.toLowerCase()
          );
          
          setGuestRecord({
            id: viewerGuest?.id || '',
            email: data.viewer.email,
            name: viewerGuest?.name,
            ...data.viewer.permissions,
          });
          setPermissions(data.viewer.permissions);
          setIsAuthenticated(true);
          return;
        }
      }

      // Fallback: Direct query for public booking view (no special permissions)
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

      // Get the profile for the host
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

      // No token means no special permissions
      setIsAuthenticated(false);
    } catch (error: unknown) {
      console.error("Error loading booking:", error);
      toast.error("Could not find this booking or access is invalid");
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

  const handleCancelled = () => {
    loadBookingAndValidateAccess();
  };

  const handleTimeProposed = () => {
    toast.success("Your time proposal has been sent to the host!");
    setShowProposeTime(false);
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
  const hasAnyPermission = Object.values(permissions).some(Boolean);

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {isAuthenticated ? "Your Meeting Invitation" : "Booking Details"}
          </h1>
          <p className="text-muted-foreground">
            Meeting with {booking.profiles?.full_name || "the host"}
          </p>
          {guestRecord && (
            <p className="text-sm text-muted-foreground mt-1">
              Viewing as: {guestRecord.email}
            </p>
          )}
        </div>

        {/* Authenticated Guest Badge */}
        {isAuthenticated && hasAnyPermission && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4 text-primary" />
            <span>You have special permissions for this meeting</span>
          </div>
        )}

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

            {/* Booker Info */}
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">Booked by</p>
                <p className="text-sm text-muted-foreground">
                  {booking.guest_name} ({booking.guest_email})
                </p>
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

        {/* Actions Card - Show if authenticated with permissions */}
        {canModify && isAuthenticated && hasAnyPermission && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Your Actions
              </CardTitle>
              <CardDescription>
                These actions were granted to you by the person who booked this meeting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-3">
                {permissions.can_propose_times && (
                  <Button 
                    variant="outline" 
                    onClick={() => setShowProposeTime(true)}
                    className="flex-1 min-w-[140px]"
                  >
                    <Clock3 className="w-4 h-4 mr-2" />
                    Propose Time
                  </Button>
                )}
                
                {permissions.can_reschedule && (
                  <Button 
                    variant="outline" 
                    className="flex-1 min-w-[140px]"
                    onClick={() => {
                      window.location.href = `/book/${booking.booking_links?.slug}?reschedule=${booking.id}`;
                    }}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reschedule
                  </Button>
                )}
                
                {permissions.can_add_attendees && (
                  <Button 
                    variant="outline" 
                    className="flex-1 min-w-[140px]"
                    onClick={() => toast.info("Add attendees feature coming soon")}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Attendees
                  </Button>
                )}
                
                {permissions.can_cancel && (
                  <Button 
                    variant="outline"
                    className="flex-1 min-w-[140px] border-destructive text-destructive hover:bg-destructive/10"
                    onClick={() => setShowCancel(true)}
                  >
                    <CalendarX className="w-4 h-4 mr-2" />
                    Cancel Meeting
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Basic Actions for non-authenticated or no permissions */}
        {canModify && (!isAuthenticated || !hasAnyPermission) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Need to make changes?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Please contact the person who booked this meeting or the host to make changes.
              </p>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => window.location.href = `mailto:${booking.guest_email}`}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Booker
                </Button>
              </div>
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

      {/* Propose Time Dialog */}
      {booking && (
        <ProposeTimeDialog
          open={showProposeTime}
          onOpenChange={setShowProposeTime}
          bookingId={booking.id}
          bookingLinkSlug={booking.booking_links?.slug || ''}
          accessToken={accessToken}
          proposerEmail={guestRecord?.email}
          proposerName={guestRecord?.name}
          onProposed={handleTimeProposed}
        />
      )}

      {/* Cancel Dialog */}
      {booking && (
        <CancelBookingDialog
          open={showCancel}
          onOpenChange={setShowCancel}
          bookingId={booking.id}
          accessToken={accessToken}
          onCancelled={handleCancelled}
        />
      )}
    </div>
  );
}
