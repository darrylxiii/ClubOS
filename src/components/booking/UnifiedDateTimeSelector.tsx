import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Clock, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBookingAnalytics } from "@/hooks/useBookingAnalytics";

interface TimeSlot {
  start: string;
  end: string;
  date: string;
}

interface UnifiedDateTimeSelectorProps {
  bookingLink: {
    id: string;
    slug: string;
    user_id: string;
    duration_minutes: number;
  };
  onDateTimeSelected: (date: Date, time: string) => void;
}

export function UnifiedDateTimeSelector({
  bookingLink,
  onDateTimeSelected,
}: UnifiedDateTimeSelectorProps) {
  const { trackStep, trackSlotView } = useBookingAnalytics(bookingLink.id);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const loadSlotsForDate = async (date: Date) => {
    setLoading(true);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const { data, error } = await supabase.functions.invoke("get-available-slots", {
        body: {
          bookingLinkSlug: bookingLink.slug,
          dateRange: {
            start: dateStr,
            end: dateStr,
          },
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });

      if (error) throw error;

      const slots = (data.slots || []).map((slot: string) => {
        const [time, dateStr] = slot.split(" - ");
        return {
          start: time,
          end: "",
          date: dateStr,
        };
      });

      setAvailableSlots(slots);

      if (slots.length === 0) {
        toast.info("No available times for this date. Please select another date.");
      }
    } catch (error: any) {
      console.error("Error loading slots:", error);
      toast.error("Failed to load available times");
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    setSelectedSlot(null);
    trackStep("calendar_view");
    loadSlotsForDate(date);
  };

  const handleTimeSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    trackSlotView(slot.start);
    trackStep("time_select");
    onDateTimeSelected(selectedDate!, slot.start);
  };

  const formatTimeSlot = (time: string) => {
    try {
      const [hours, minutes] = time.split(":");
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return format(date, "h:mm a");
    } catch {
      return time;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Calendar Section - Left Side (40%) */}
        <Card className="p-6 lg:col-span-2">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CalendarIcon className="h-4 w-4 text-primary" />
              <span>Select a Date</span>
            </div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              className="rounded-md border"
            />
            {selectedDate && (
              <p className="text-xs text-muted-foreground text-center">
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </p>
            )}
          </div>
        </Card>

        {/* Time Slots Section - Right Side (60%) */}
        <Card className="p-6 lg:col-span-3">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4 text-primary" />
                <span>Select a Time</span>
              </div>
              {selectedDate && (
                <span className="text-xs text-muted-foreground">
                  {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </span>
              )}
            </div>

            {!selectedDate && (
              <div className="flex items-center justify-center h-64 text-center text-muted-foreground">
                <div className="space-y-2">
                  <CalendarIcon className="h-12 w-12 mx-auto opacity-20" />
                  <p className="text-sm">Select a date to view available times</p>
                </div>
              </div>
            )}

            {selectedDate && loading && (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            )}

            {selectedDate && !loading && availableSlots.length === 0 && (
              <div className="flex items-center justify-center h-64 text-center text-muted-foreground">
                <div className="space-y-2">
                  <Clock className="h-12 w-12 mx-auto opacity-20" />
                  <p className="text-sm">No available times for this date</p>
                  <p className="text-xs">Please select another date</p>
                </div>
              </div>
            )}

            {selectedDate && !loading && availableSlots.length > 0 && (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {availableSlots.map((slot, index) => (
                  <Button
                    key={index}
                    variant={selectedSlot?.start === slot.start ? "default" : "outline"}
                    className={cn(
                      "w-full justify-start text-left h-12 transition-all",
                      selectedSlot?.start === slot.start && "ring-2 ring-primary"
                    )}
                    onClick={() => handleTimeSelect(slot)}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    {formatTimeSlot(slot.start)}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Mobile View Helper */}
      <div className="lg:hidden">
        {selectedDate && availableSlots.length > 0 && (
          <p className="text-xs text-center text-muted-foreground">
            Scroll to see more time slots
          </p>
        )}
      </div>
    </div>
  );
}
