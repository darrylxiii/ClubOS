import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { addDays, format, startOfDay, endOfDay } from "date-fns";

interface AvailabilityCalendarProps {
  bookingLink: {
    id: string;
    slug: string;
    advance_booking_days?: number;
    min_notice_hours?: number;
  };
  onDateSelect: (date: Date) => void;
}

interface DayAvailability {
  date: string;
  slotCount: number;
}

export function AvailabilityCalendar({
  bookingLink,
  onDateSelect,
}: AvailabilityCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [availability, setAvailability] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const minDate = new Date(
    Date.now() + (bookingLink.min_notice_hours || 24) * 60 * 60 * 1000
  );
  const maxDate = addDays(new Date(), bookingLink.advance_booking_days || 60);

  useEffect(() => {
    loadMonthAvailability();
  }, [currentMonth, bookingLink.slug]);

  const loadMonthAvailability = async () => {
    setLoading(true);
    
    const startDate = startOfDay(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1));
    const endDate = endOfDay(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0));

    try {
      const { data, error } = await supabase.functions.invoke("get-available-slots", {
        body: {
          bookingLinkSlug: bookingLink.slug,
          dateRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });

      if (error) throw error;

      // Group slots by date
      const availabilityMap = new Map<string, number>();
      if (data?.slots) {
        data.slots.forEach((slot: { start: string; end: string }) => {
          const date = format(new Date(slot.start), "yyyy-MM-dd");
          availabilityMap.set(date, (availabilityMap.get(date) || 0) + 1);
        });
      }

      setAvailability(availabilityMap);
    } catch (error) {
      console.error("Error loading availability:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      onDateSelect(date);
    }
  };

  const getDateAvailability = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return availability.get(dateStr) || 0;
  };

  const isDayDisabled = (date: Date) => {
    return date < minDate || date > maxDate || getDateAvailability(date) === 0;
  };

  const modifiers = {
    hasSlots: (date: Date) => {
      const count = getDateAvailability(date);
      return count > 0 && count <= 3;
    },
    manySlots: (date: Date) => getDateAvailability(date) > 3,
  };

  const modifiersStyles = {
    hasSlots: {
      position: "relative" as const,
    },
    manySlots: {
      position: "relative" as const,
      fontWeight: "600",
    },
  };

  return (
    <div className="space-y-4">
      {loading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={handleSelect}
        disabled={isDayDisabled}
        modifiers={modifiers}
        modifiersStyles={modifiersStyles}
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
                  <div className="absolute bottom-1 flex gap-0.5">
                    {count > 0 && (
                      <div className={`w-1 h-1 rounded-full ${
                        count > 3 ? "bg-green-500" : "bg-yellow-500"
                      }`} />
                    )}
                    {count > 1 && (
                      <div className={`w-1 h-1 rounded-full ${
                        count > 3 ? "bg-green-500" : "bg-yellow-500"
                      }`} />
                    )}
                    {count > 2 && (
                      <div className={`w-1 h-1 rounded-full ${
                        count > 3 ? "bg-green-500" : "bg-yellow-500"
                      }`} />
                    )}
                  </div>
                )}
              </div>
            );
          },
        }}
      />
      
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <span>Limited availability</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span>Good availability</span>
        </div>
      </div>
    </div>
  );
}