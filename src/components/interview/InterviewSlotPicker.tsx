import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, RefreshCw, Calendar as CalendarIcon } from "lucide-react";
import { format, startOfDay, endOfDay, addDays } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { getAvailableSlots } from "@/services/availability";
import { getUserTimezone, formatTimeSlot } from "@/lib/timezoneUtils";
import { cn } from "@/lib/utils";

interface TimeSlot {
  start: string;
  end: string;
}

interface InterviewSlotPickerProps {
  bookingLink: {
    id: string;
    slug: string;
    duration_minutes: number;
    advance_booking_days?: number | null;
    min_notice_hours?: number | null;
  };
  onSlotSelect: (slot: { date: Date; time: string; start: string; end: string }) => void;
  selectedSlot?: { start: string } | null;
}

export function InterviewSlotPicker({
  bookingLink,
  onSlotSelect,
  selectedSlot,
}: InterviewSlotPickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState<Map<string, number>>(new Map());
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const minDate = new Date(
    Date.now() + (bookingLink.min_notice_hours || 24) * 60 * 60 * 1000
  );
  const maxDate = addDays(new Date(), bookingLink.advance_booking_days || 60);
  const userTimezone = getUserTimezone();

  // Load month availability for calendar highlighting
  useEffect(() => {
    loadMonthAvailability();
  }, [currentMonth, bookingLink.slug]);

  // Load slots when date is selected
  useEffect(() => {
    if (selectedDate) {
      loadDaySlots(selectedDate);
    }
  }, [selectedDate]);

  const loadMonthAvailability = async () => {
    setCalendarLoading(true);
    
    const startDate = startOfDay(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1));
    const endDate = endOfDay(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0));

    try {
      const data = await getAvailableSlots({
        bookingLinkSlug: bookingLink.slug,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        timezone: userTimezone,
      });

      const availabilityMap = new Map<string, number>();
      if (data?.slots) {
        data.slots.forEach((slot: { start: string }) => {
          const date = format(new Date(slot.start), "yyyy-MM-dd");
          availabilityMap.set(date, (availabilityMap.get(date) || 0) + 1);
        });
      }

      setAvailability(availabilityMap);
    } catch (error) {
      console.error("Error loading availability:", error);
    } finally {
      setCalendarLoading(false);
    }
  };

  const loadDaySlots = async (date: Date) => {
    setLoading(true);
    
    try {
      const dateRange = {
        start: startOfDay(date).toISOString(),
        end: endOfDay(date).toISOString(),
      };

      const data = await getAvailableSlots({
        bookingLinkSlug: bookingLink.slug,
        dateRange,
        timezone: userTimezone,
      });

      const normalizedSlots: TimeSlot[] = Array.isArray(data.slots)
        ? data.slots
            .map((slot: unknown) => {
              if (!slot || typeof slot !== 'object') return null;
              const s = slot as { start?: unknown; end?: unknown };
              if (typeof s.start !== 'string') return null;
              return {
                start: s.start,
                end: typeof s.end === 'string' ? s.end : '',
              };
            })
            .filter(Boolean) as TimeSlot[]
        : [];

      setSlots(normalizedSlots);
    } catch (error) {
      console.error("Error loading slots:", error);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSlotClick = (slot: TimeSlot) => {
    const timeStr = format(new Date(slot.start), "h:mm a");
    onSlotSelect({
      date: selectedDate!,
      time: timeStr,
      start: slot.start,
      end: slot.end,
    });
  };

  const getDateAvailability = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return availability.get(dateStr) || 0;
  };

  const isDayDisabled = (date: Date) => {
    return date < minDate || date > maxDate || getDateAvailability(date) === 0;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Calendar */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-muted-foreground" />
          <h4 className="font-semibold">Select a Date</h4>
        </div>
        
        {calendarLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          disabled={isDayDisabled}
          onMonthChange={setCurrentMonth}
          className="rounded-md border"
          components={{
            DayContent: ({ date }) => {
              const count = getDateAvailability(date);
              const isDisabled = isDayDisabled(date);
              
              return (
                <div className="relative w-full h-full flex flex-col items-center justify-center">
                  <span>{date.getDate()}</span>
                  {count > 0 && !isDisabled && (
                    <div className="absolute bottom-0.5 flex gap-0.5">
                      <div className={cn(
                        "w-1 h-1 rounded-full",
                        count > 3 ? "bg-success" : "bg-warning"
                      )} />
                    </div>
                  )}
                </div>
              );
            },
          }}
        />
        
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-warning" />
            <span>Limited</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span>Available</span>
          </div>
        </div>
      </div>

      {/* Time Slots */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <h4 className="font-semibold">
              {selectedDate ? format(selectedDate, "EEE, MMM d") : "Select a Time"}
            </h4>
          </div>
          {selectedDate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadDaySlots(selectedDate)}
              disabled={loading}
              className="h-8"
            >
              <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
            </Button>
          )}
        </div>

        {!selectedDate ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Select a date to see available times
            </p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">Loading times...</p>
          </div>
        ) : slots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No available times for this date</p>
            <p className="text-sm text-muted-foreground">Try another date</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-1">
            {slots.map((slot, index) => {
              const isSelected = selectedSlot?.start === slot.start;
              const timeStr = formatTimeSlot(slot.start, slot.end, userTimezone);
              
              return (
                <Button
                  key={index}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "justify-center h-10",
                    isSelected && "ring-2 ring-primary ring-offset-2"
                  )}
                  onClick={() => handleSlotClick(slot)}
                >
                  {timeStr.split(" - ")[0]}
                </Button>
              );
            })}
          </div>
        )}

        {selectedDate && slots.length > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            Times shown in {userTimezone.replace(/_/g, " ")}
          </p>
        )}
      </div>
    </div>
  );
}
