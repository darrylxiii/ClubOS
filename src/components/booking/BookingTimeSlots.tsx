import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toZonedTime, formatInTimeZone } from "date-fns-tz";

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
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  useEffect(() => {
    loadAvailableSlots();
  }, [selectedDate, bookingLink]);

  const loadAvailableSlots = async () => {
    setLoading(true);
    try {
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Create start and end dates in user's timezone
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      const startDate = startOfDay.toISOString();
      const endDate = endOfDay.toISOString();

      const { data, error } = await supabase.functions.invoke("get-available-slots", {
        body: {
          bookingLinkSlug: bookingLink.slug,
          dateRange: { start: startDate, end: endDate },
          timezone: userTimezone,
        },
      });

      if (error) {
        console.error("Slots API error:", error);
        throw new Error(error.message || "Failed to fetch slots");
      }

      setSlots(data.slots || []);
    } catch (error: any) {
      console.error("Error loading slots:", error);
      
      // Provide more specific error messages
      const errorMessage = error.message?.includes("timeout")
        ? "Request timed out. Please try again."
        : error.message?.includes("network")
        ? "Network error. Please check your connection."
        : "Failed to load available time slots. Please try again.";
      
      toast.error(errorMessage);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSlotClick = (slot: TimeSlot) => {
    const timeStr = format(new Date(slot.start), "h:mm a");
    setSelectedSlot(slot.start);
    onTimeSelect(timeStr);
  };

  const formatTimeSlot = (slot: TimeSlot) => {
    const start = new Date(slot.start);
    const end = new Date(slot.end);
    return `${format(start, "h:mm a")} - ${format(end, "h:mm a")}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading available times...</p>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No times available</h3>
        <p className="text-muted-foreground">
          All slots are booked for this date. Please select a different date or join the waitlist.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Select a Time</h3>
        <p className="text-sm text-muted-foreground">
          {format(selectedDate, "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto px-2">
        {slots.map((slot, index) => {
          const isSelected = selectedSlot === slot.start;
          return (
            <Button
              key={index}
              variant={isSelected ? "default" : "outline"}
              className="h-auto py-3 px-4 text-sm font-medium"
              onClick={() => handleSlotClick(slot)}
            >
              {formatTimeSlot(slot)}
            </Button>
          );
        })}
      </div>

      <p className="text-xs text-center text-muted-foreground mt-4">
        All times shown in your local timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone})
      </p>
    </div>
  );
}
