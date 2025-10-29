import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { format, addDays, startOfWeek, isSameDay, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface BookingWeekViewProps {
  bookingLink: {
    id: string;
    slug: string;
    user_id: string;
    title: string;
    duration_minutes: number;
  };
  onTimeSelect: (date: Date, time: string) => void;
}

interface TimeSlot {
  start: string;
  end: string;
  date: Date;
}

export function BookingWeekView({ bookingLink, onTimeSelect }: BookingWeekViewProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [slots, setSlots] = useState<Record<string, TimeSlot[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  useEffect(() => {
    loadWeekSlots();
  }, [currentWeekStart, bookingLink]);

  const loadWeekSlots = async () => {
    setLoading(true);
    try {
      const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
      const slotsData: Record<string, TimeSlot[]> = {};

      for (const day of weekDays) {
        const dateStr = format(day, "yyyy-MM-dd");
        const startDate = `${dateStr}T00:00:00Z`;
        const endDate = `${dateStr}T23:59:59Z`;

        const { data, error } = await supabase.functions.invoke("get-available-slots", {
          body: {
            bookingLinkSlug: bookingLink.slug,
            dateRange: { start: startDate, end: endDate },
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        });

        if (!error && data?.slots) {
          slotsData[dateStr] = data.slots.map((slot: any) => ({
            ...slot,
            date: day,
          }));
        } else {
          slotsData[dateStr] = [];
        }
      }

      setSlots(slotsData);
    } catch (error: any) {
      console.error("Error loading week slots:", error);
      toast.error("Failed to load available times");
    } finally {
      setLoading(false);
    }
  };

  const handleSlotClick = (slot: TimeSlot) => {
    const timeStr = format(parseISO(slot.start), "h:mm a");
    setSelectedSlot(slot.start);
    onTimeSelect(slot.date, timeStr);
  };

  const nextWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, 7));
  };

  const prevWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, -7));
  };

  const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM to 9 PM

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading week view...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={prevWeek}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">
          {format(currentWeekStart, "MMM d")} - {format(addDays(currentWeekStart, 6), "MMM d, yyyy")}
        </h3>
        <Button variant="outline" size="sm" onClick={nextWeek}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-8 gap-2 overflow-x-auto">
        {/* Time column */}
        <div className="space-y-2">
          <div className="h-12 border-b" />
          {hours.map((hour) => (
            <div key={hour} className="h-16 text-xs text-muted-foreground">
              {format(new Date().setHours(hour, 0), "h:mm a")}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {Array.from({ length: 7 }, (_, i) => {
          const day = addDays(currentWeekStart, i);
          const dateStr = format(day, "yyyy-MM-dd");
          const daySlots = slots[dateStr] || [];
          const isToday = isSameDay(day, new Date());

          return (
            <div key={i} className="space-y-2">
              <div className={cn(
                "h-12 border-b flex flex-col items-center justify-center",
                isToday && "bg-primary/10"
              )}>
                <div className="text-xs text-muted-foreground">
                  {format(day, "EEE")}
                </div>
                <div className={cn(
                  "text-sm font-medium",
                  isToday && "text-primary"
                )}>
                  {format(day, "d")}
                </div>
              </div>

              {hours.map((hour) => {
                const hourSlots = daySlots.filter((slot) => {
                  const slotHour = parseISO(slot.start).getHours();
                  return slotHour === hour;
                });

                return (
                  <div key={hour} className="h-16 relative">
                    {hourSlots.map((slot, idx) => {
                      const isSelected = selectedSlot === slot.start;
                      return (
                        <Button
                          key={idx}
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          className="w-full h-8 text-xs mb-1"
                          onClick={() => handleSlotClick(slot)}
                        >
                          {format(parseISO(slot.start), "h:mm")}
                        </Button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-center text-muted-foreground mt-4">
        Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
      </p>
    </div>
  );
}
