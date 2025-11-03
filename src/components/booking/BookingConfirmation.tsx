import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Calendar, Clock, Mail, MapPin, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { BookingSyncStatus } from "./BookingSyncStatus";

interface BookingConfirmationProps {
  bookingId: string;
  bookingLink: {
    title: string;
    duration_minutes: number;
    color: string;
  };
}

interface Booking {
  id: string;
  guest_name: string;
  guest_email: string;
  scheduled_start: string;
  scheduled_end: string;
  notes: string | null;
  synced_to_calendar?: boolean;
  calendar_provider?: string | null;
  meeting_id?: string | null;
  booking_links?: {
    enable_club_ai?: boolean;
  };
}

export function BookingConfirmation({
  bookingId,
  bookingLink,
}: BookingConfirmationProps) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCancel, setShowCancel] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);

  useEffect(() => {
    loadBooking();
  }, [bookingId]);

  const loadBooking = async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          booking_links (
            enable_club_ai
          )
        `)
        .eq("id", bookingId)
        .single();

      if (error) throw error;
      setBooking(data);
    } catch (error: any) {
      console.error("Error loading booking:", error);
      toast.error("Failed to load booking details");
    } finally {
      setLoading(false);
    }
  };

  const addToCalendar = (type: "google" | "outlook" | "apple") => {
    if (!booking) return;

    const start = new Date(booking.scheduled_start);
    const end = new Date(booking.scheduled_end);
    
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const title = encodeURIComponent(bookingLink.title);
    const details = encodeURIComponent(`Meeting with ${booking.guest_name}`);
    const location = encodeURIComponent("Video Call");

    if (type === "google") {
      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${formatDate(start)}/${formatDate(end)}`;
      window.open(url, "_blank");
    } else if (type === "outlook") {
      const url = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&body=${details}&location=${location}&startdt=${start.toISOString()}&enddt=${end.toISOString()}`;
      window.open(url, "_blank");
    } else if (type === "apple") {
      // Create ICS file for Apple Calendar
      const icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        `DTSTART:${formatDate(start)}`,
        `DTEND:${formatDate(end)}`,
        `SUMMARY:${bookingLink.title}`,
        `DESCRIPTION:Meeting with ${booking.guest_name}`,
        "LOCATION:Video Call",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\n");

      const blob = new Blob([icsContent], { type: "text/calendar" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "meeting.ics";
      link.click();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load booking details</p>
      </div>
    );
  }

  const startDate = new Date(booking.scheduled_start);
  const endDate = new Date(booking.scheduled_end);

  return (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-4">
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
          style={{ backgroundColor: `${bookingLink.color}20` }}
        >
          <CheckCircle2
            className="h-8 w-8"
            style={{ color: bookingLink.color }}
          />
        </div>
        
        <div>
          <h3 className="text-2xl font-bold mb-2">You're all set!</h3>
          <p className="text-muted-foreground">
            A confirmation email has been sent to {booking.guest_email}
          </p>
        </div>
      </div>

      <div className="border rounded-lg p-6 space-y-4 bg-muted/30">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-lg">{bookingLink.title}</h4>
          <BookingSyncStatus
            syncedToCalendar={booking.synced_to_calendar}
            calendarProvider={booking.calendar_provider}
            meetingCreated={!!booking.meeting_id}
            clubAIEnabled={booking.booking_links?.enable_club_ai}
          />
        </div>
        
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">
                {format(startDate, "EEEE, MMMM d, yyyy")}
              </p>
              <p className="text-muted-foreground">
                {format(startDate, "h:mm a")} - {format(endDate, "h:mm a")}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">{bookingLink.duration_minutes} minutes</p>
              <p className="text-muted-foreground">
                {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">Confirmation sent to:</p>
              <p className="text-muted-foreground">{booking.guest_email}</p>
            </div>
          </div>
        </div>

        {booking.notes && (
          <div className="pt-3 border-t">
            <p className="text-sm font-medium mb-1">Your notes:</p>
            <p className="text-sm text-muted-foreground">{booking.notes}</p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-center">Add to your calendar:</p>
        <div className="grid grid-cols-3 gap-3">
          <Button
            variant="outline"
            onClick={() => addToCalendar("google")}
            className="w-full"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Google
          </Button>
          <Button
            variant="outline"
            onClick={() => addToCalendar("outlook")}
            className="w-full"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Outlook
          </Button>
          <Button
            variant="outline"
            onClick={() => addToCalendar("apple")}
            className="w-full"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Apple
          </Button>
        </div>
      </div>

      <div className="text-center pt-4">
        <p className="text-sm text-muted-foreground mb-4">
          Need to make changes? Contact us with your booking ID:
        </p>
        <code className="px-3 py-1.5 bg-muted rounded text-xs font-mono">
          {booking.id.slice(0, 8)}
        </code>
      </div>
    </div>
  );
}
