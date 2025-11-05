import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { format, addDays, startOfWeek, isSameDay, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useSwipeable } from "react-swipeable";

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
  const [loadingStage, setLoadingStage] = useState<string>("Loading week...");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  useEffect(() => {
    loadWeekSlots();
  }, [currentWeekStart, bookingLink]);

  const loadWeekSlots = async () => {
    setLoading(true);
    setLoadingStage("Loading week availability...");
    const weekSlots: Record<string, TimeSlot[]> = {};
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    try {
      setLoadingStage("Fetching time slots...");
      // Load slots for all days in parallel (Performance optimization)
      const slotPromises = Array.from({ length: 7 }, async (_, i) => {
        const date = addDays(currentWeekStart, i);
        const dateStr = format(date, "yyyy-MM-dd");
        
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        const startDate = startOfDay.toISOString();
        const endDate = endOfDay.toISOString();

        try {
          const { data, error } = await supabase.functions.invoke("get-available-slots", {
            body: {
              bookingLinkSlug: bookingLink.slug,
              dateRange: { start: startDate, end: endDate },
              timezone: userTimezone,
            },
          });

          if (!error && data?.slots) {
            return { dateStr, slots: data.slots.map((slot: any) => ({ ...slot, date })) };
          }
        } catch (err) {
          console.error(`Error loading slots for ${dateStr}:`, err);
        }
        return { dateStr, slots: [] };
      });

      setLoadingStage("Organizing times...");
      const results = await Promise.all(slotPromises);
      results.forEach(({ dateStr, slots: daySlots }) => {
        weekSlots[dateStr] = daySlots;
      });
      
      setSlots(weekSlots);
    } catch (error: any) {
      console.error("Error loading week slots:", error);
      const errorMsg = error.message?.includes("timeout")
        ? "Request timed out. Please try again."
        : "Failed to load week view. Please refresh the page.";
      toast.error(errorMsg);
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

  // Phase 4: Swipe navigation for mobile
  const swipeHandlers = useSwipeable({
    onSwipedLeft: nextWeek,
    onSwipedRight: prevWeek,
    trackMouse: false,
  });

  const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM to 9 PM

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <div className="text-center space-y-2">
          <p className="text-base font-medium">{loadingStage}</p>
          <p className="text-sm text-muted-foreground">Please wait...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" {...swipeHandlers}>
      <div className="flex items-center justify-between">
        {/* Phase 4: 44px touch targets */}
        <Button variant="outline" size="sm" onClick={prevWeek} className="min-h-[44px] min-w-[44px]">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-base sm:text-lg font-semibold text-center">
          {format(currentWeekStart, "MMM d")} - {format(addDays(currentWeekStart, 6), "MMM d, yyyy")}
        </h3>
        <Button variant="outline" size="sm" onClick={nextWeek} className="min-h-[44px] min-w-[44px]">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      <p className="text-xs text-center text-muted-foreground md:hidden">
        Swipe left or right to navigate weeks
      </p>

      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <div className="grid grid-cols-8 gap-2 min-w-[800px] md:min-w-0">
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
                            className="w-full min-h-[44px] text-xs mb-1 touch-manipulation"
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
      </div>

      <p className="text-xs text-center text-muted-foreground mt-4">
        Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
      </p>
    </div>
  );
}
