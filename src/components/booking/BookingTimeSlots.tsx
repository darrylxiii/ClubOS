import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Clock, Loader2, RefreshCw, Bell, Users } from "lucide-react";
import { format } from "date-fns";
import { getUserTimezone, getDateRangeForTimezone, formatTimeSlot } from "@/lib/timezoneUtils";
import { useSwipeable } from "react-swipeable";
import { useBookingRealtime } from "@/hooks/useBookingRealtime";
import { useBookingAnalytics } from "@/hooks/useBookingAnalytics";
import { WaitlistForm } from "./WaitlistForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface BookingTimeSlotsProps {
  bookingLink: {
    id: string;
    slug: string;
    user_id: string;
    title: string;
    duration_minutes: number;
  };
  selectedDate: Date;
  onTimeSelect: (time: string) => void;
}

interface TimeSlot {
  start: string;
  end: string;
}

export function BookingTimeSlots({
  bookingLink,
  selectedDate,
  onTimeSelect,
}: BookingTimeSlotsProps) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState<string>("Connecting...");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [showWaitlist, setShowWaitlist] = useState(false);

  // Phase 6: Real-time updates
  const { liveBookingsCount } = useBookingRealtime({
    bookingLinkId: bookingLink.id,
    selectedDate,
    onSlotBooked: () => {
      toast.info("A slot was just booked. Refreshing availability...");
      loadAvailableSlots();
    },
    onSlotCancelled: () => {
      toast.success("A slot just became available!");
      loadAvailableSlots();
    },
  });

  // Phase 7: Analytics
  const { trackStep, trackSlotView } = useBookingAnalytics(bookingLink.id);

  useEffect(() => {
    loadAvailableSlots();
    trackStep("time_select");
  }, [selectedDate, bookingLink]);

  const loadAvailableSlots = async (isRetry = false) => {
    setLoading(true);
    if (isRetry) {
      setRetrying(true);
    }
    
    try {
      setLoadingStage("Connecting to server...");
      const userTimezone = getUserTimezone();
      const dateRange = getDateRangeForTimezone(selectedDate, userTimezone);

      setLoadingStage("Checking availability...");
      const { data, error } = await supabase.functions.invoke("get-available-slots", {
        body: {
          bookingLinkSlug: bookingLink.slug,
          dateRange,
          timezone: userTimezone,
        },
      });

      if (error) {
        console.error("Slots API error:", error);
        throw new Error(error.message || "Failed to fetch slots");
      }

      setLoadingStage("Loading times...");
      setSlots(data.slots || []);
    } catch (error: unknown) {
      console.error("Error loading slots:", error);
      
      const errMessage = error instanceof Error ? error.message : "Unknown error";
      // Specific error messages based on error type
      const errorMessage = errMessage.includes("timeout")
        ? "Connection timed out. Please check your internet and try again."
        : errMessage.includes("network") || errMessage.includes("fetch")
        ? "Network error. Please verify your internet connection."
        : errMessage.includes("404")
        ? "Booking link not found. Please verify the URL."
        : errMessage.includes("403") || errMessage.includes("unauthorized")
        ? "Access denied. This booking link may be inactive."
        : "Unable to load time slots. Please try refreshing the page.";
      
      toast.error(errorMessage);
      setSlots([]);
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  };

  const handleSlotClick = (slot: TimeSlot) => {
    const timeStr = format(new Date(slot.start), "h:mm a");
    setSelectedSlot(slot.start);
    trackSlotView(slot.start); // Phase 7: Track slot view
    onTimeSelect(timeStr);
  };

  const formatTimeSlotDisplay = (slot: TimeSlot) => {
    const userTimezone = getUserTimezone();
    return formatTimeSlot(slot.start, slot.end, userTimezone);
  };

  // Swipe handlers for mobile navigation
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      // Could navigate to next date
    },
    onSwipedRight: () => {
      // Could navigate to previous date
    },
    trackMouse: false,
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <div className="text-center space-y-2">
          <p className="text-base font-medium">{loadingStage}</p>
          <p className="text-sm text-muted-foreground">
            {retrying ? "Retrying connection..." : "This will just take a moment"}
          </p>
        </div>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <>
        <div className="text-center py-12 space-y-6">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">No times available</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              All slots are booked for this date.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => loadAvailableSlots(true)}
              disabled={retrying}
              className="min-h-[44px]"
            >
              {retrying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </>
              )}
            </Button>
            <Button
              onClick={() => setShowWaitlist(true)}
              className="min-h-[44px]"
            >
              <Bell className="mr-2 h-4 w-4" />
              Join Waitlist
            </Button>
          </div>
        </div>

        <Dialog open={showWaitlist} onOpenChange={setShowWaitlist}>
          <DialogContent className="sm:max-w-md">
            <WaitlistForm
              bookingLinkId={bookingLink.id}
              bookingLinkTitle={bookingLink.title}
              preferredDate={selectedDate}
              onSuccess={() => setShowWaitlist(false)}
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="space-y-6" {...swipeHandlers}>
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <h3 className="text-lg font-semibold">Select a Time</h3>
          {liveBookingsCount > 0 && (
            <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
              <Users className="h-3 w-3" />
              {liveBookingsCount} booking{liveBookingsCount !== 1 ? "s" : ""} today
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {format(selectedDate, "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* Phase 4: Responsive grid - 1 col mobile, 2 tablet, 3 desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto px-1">
        {slots.map((slot, index) => {
          const isSelected = selectedSlot === slot.start;
          return (
            <Button
              key={index}
              variant={isSelected ? "default" : "outline"}
              className="min-h-[44px] py-3 px-4 text-sm font-medium touch-manipulation"
              onClick={() => handleSlotClick(slot)}
            >
              {formatTimeSlotDisplay(slot)}
            </Button>
          );
        })}
      </div>

      <div className="text-center space-y-2">
        <p className="text-xs text-muted-foreground">
          All times in {Intl.DateTimeFormat().resolvedOptions().timeZone}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => loadAvailableSlots(true)}
          disabled={retrying}
          className="text-xs h-8"
        >
          <RefreshCw className="mr-1 h-3 w-3" />
          Refresh times
        </Button>
      </div>
    </div>
  );
}
