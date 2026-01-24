import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Clock, Calendar as CalendarIcon, Loader2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBookingAnalytics } from "@/hooks/useBookingAnalytics";
import { formatInTimeZone } from "date-fns-tz";
import { motion, AnimatePresence } from "framer-motion";
import { TimezoneWarning } from "@/components/booking/TimezoneWarning";
import { logger } from "@/lib/logger";
import { getAvailableSlots } from "@/services/availability";

interface TimeSlot {
  start: string;
  end: string;
}

interface AvailabilityInfo {
  date: Date;
  slotCount: number;
  status: 'many' | 'few' | 'limited' | 'none';
}

interface UnifiedDateTimeSelectorProps {
  bookingLink: {
    id: string;
    slug: string;
    user_id: string;
    duration_minutes: number;
  };
  onDateTimeSelected: (date: Date, slot: TimeSlot) => void;
  hostTimezone?: string;
}

export function UnifiedDateTimeSelector({
  bookingLink,
  onDateTimeSelected,
  hostTimezone,
}: UnifiedDateTimeSelectorProps) {
  const { trackStep, trackSlotView } = useBookingAnalytics(bookingLink.id);
  const guestTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [availabilityMap, setAvailabilityMap] = useState<Map<string, AvailabilityInfo>>(new Map());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Load availability indicators for the current month
  const loadMonthAvailability = async (monthDate: Date) => {
    try {
      const startOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const endOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

      const startStr = format(startOfMonth, "yyyy-MM-dd");
      const endStr = format(endOfMonth, "yyyy-MM-dd");

      const data = await getAvailableSlots({
        bookingLinkSlug: bookingLink.slug,
        dateRange: { start: startStr, end: endStr },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      const newAvailabilityMap = new Map<string, AvailabilityInfo>();

      // Prefer backend-provided summary when available.
      if (Array.isArray((data as any)?.availabilitySummary)) {
        (data as any).availabilitySummary.forEach((s: any) => {
          if (!s?.date || typeof s.date !== 'string') return;
          const count = typeof s.count === 'number' ? s.count : 0;
          const status = (s.status as AvailabilityInfo['status']) || 'none';
          newAvailabilityMap.set(s.date, {
            date: new Date(s.date),
            slotCount: count,
            status,
          });
        });
        setAvailabilityMap(newAvailabilityMap);
        return;
      }

      // Fallback: derive by date from slot objects.
      if (Array.isArray((data as any)?.slots)) {
        const slotsByDate = new Map<string, number>();
        (data as any).slots.forEach((slot: any) => {
          if (!slot || typeof slot !== 'object') return;
          if (typeof slot.start !== 'string') return;
          const dateStr = slot.start.split('T')[0];
          if (!dateStr) return;
          slotsByDate.set(dateStr, (slotsByDate.get(dateStr) || 0) + 1);
        });

        slotsByDate.forEach((count, dateStr) => {
          let status: 'many' | 'few' | 'limited' | 'none';
          if (count >= 10) status = 'many';
          else if (count >= 4) status = 'few';
          else if (count >= 1) status = 'limited';
          else status = 'none';

          newAvailabilityMap.set(dateStr, {
            date: new Date(dateStr),
            slotCount: count,
            status,
          });
        });

        setAvailabilityMap(newAvailabilityMap);
      }
    } catch (error) {
      logger.error('Error loading month availability', error as Error, { componentName: 'UnifiedDateTimeSelector' });
    }
  };

  // Auto-select tomorrow's date and load month availability on initial load
  useEffect(() => {
    if (!selectedDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      setSelectedDate(tomorrow);
      setCurrentMonth(tomorrow);
      loadSlotsForDate(tomorrow);
      loadMonthAvailability(tomorrow);
    }
  }, []);

  const loadSlotsForDate = async (date: Date) => {
    setLoading(true);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      logger.debug('Loading slots for date', { componentName: 'UnifiedDateTimeSelector', dateStr, slug: bookingLink.slug });

      const data = await getAvailableSlots({
        bookingLinkSlug: bookingLink.slug,
        dateRange: { start: dateStr, end: dateStr },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      if (!data || !data.slots) {
        logger.error('Invalid response structure', new Error('Missing slots array'), { componentName: 'UnifiedDateTimeSelector', data });
        throw new Error('Invalid response: missing slots array');
      }

      logger.debug('Slots received', { componentName: 'UnifiedDateTimeSelector', slotsCount: data.slots.length });

      // Validate that slots is an array
      if (!Array.isArray(data.slots)) {
        throw new Error(`Expected slots to be an array, got ${typeof data.slots}`);
      }

      const slots = (data.slots as unknown[])
        .map((slot: unknown) => {
          if (!slot || typeof slot !== 'object') return null;
          const s = slot as { start?: unknown; end?: unknown };
          if (typeof s.start !== 'string') return null;

          // End is required for booking; be defensive for any older payloads.
          if (typeof s.end !== 'string' || !s.end) {
            try {
              const startMs = new Date(s.start).getTime();
              if (!Number.isFinite(startMs)) return null;
              const endIso = new Date(startMs + bookingLink.duration_minutes * 60 * 1000).toISOString();
              return { start: s.start, end: endIso } satisfies TimeSlot;
            } catch {
              return null;
            }
          }
          return { start: s.start, end: s.end } satisfies TimeSlot;
        })
        .filter(Boolean) as TimeSlot[];

      setAvailableSlots(slots);

      if (slots.length === 0) {
        toast.info("No available times for this date. Please select another date.");
      } else {
        toast.success(`Found ${slots.length} available times`);
      }
    } catch (error: any) {
      logger.error('Error loading slots', error as Error, { componentName: 'UnifiedDateTimeSelector' });
      const message = String(error?.message || 'Unknown error');
      if (message.startsWith('availability_missing_backend_config')) {
        toast.error('Availability temporarily unreachable. Please refresh.');
      } else {
        toast.error(`Failed to load available times: ${message}`);
      }
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
    onDateTimeSelected(selectedDate!, slot);
  };

  const formatTimeOnly = (isoStart: string) => {
    try {
      return formatInTimeZone(isoStart, guestTimezone, 'h:mm a');
    } catch (error) {
      logger.error('Error formatting time', error as Error, { componentName: 'UnifiedDateTimeSelector', isoStart });
      return isoStart;
    }
  };

  return (
    <div className="space-y-6">
      <style>{`
        /* Green - Many available (10+) */
        .has-availability-many::after {
          content: '';
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%);
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: hsl(142, 76%, 36%);
          box-shadow: 0 0 4px rgba(34, 197, 94, 0.5);
        }
        
        /* Yellow - Few slots (4-9) */
        .has-availability-few::after {
          content: '';
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%);
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: hsl(48, 96%, 53%);
          box-shadow: 0 0 4px rgba(234, 179, 8, 0.5);
        }
        
        /* Red - Almost full (1-3) */
        .has-availability-limited::after {
          content: '';
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%);
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: hsl(0, 84%, 60%);
          box-shadow: 0 0 4px rgba(239, 68, 68, 0.5);
          animation: pulse-red 2s infinite;
        }
        
        @keyframes pulse-red {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        
        .rdp-day_button {
          position: relative;
        }
      `}</style>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Calendar Section - Left Side (40%) */}
        <Card className="p-6 lg:col-span-2 bg-card/95 backdrop-blur">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CalendarIcon className="h-4 w-4 text-primary" />
              <span>Select a Date</span>
            </div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              onMonthChange={(month) => {
                setCurrentMonth(month);
                loadMonthAvailability(month);
              }}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              className="rounded-md border"
              modifiers={{
                availableMany: Array.from(availabilityMap.values())
                  .filter(a => a.status === 'many')
                  .map(a => a.date),
                availableFew: Array.from(availabilityMap.values())
                  .filter(a => a.status === 'few')
                  .map(a => a.date),
                availableLimited: Array.from(availabilityMap.values())
                  .filter(a => a.status === 'limited')
                  .map(a => a.date),
              }}
              modifiersClassNames={{
                availableMany: "has-availability-many",
                availableFew: "has-availability-few",
                availableLimited: "has-availability-limited",
              }}
            />
            {selectedDate && (
              <p className="text-xs text-muted-foreground text-center">
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
                {availabilityMap.has(format(selectedDate, "yyyy-MM-dd")) && (
                  <span className="ml-2 text-primary font-medium">
                    ({availabilityMap.get(format(selectedDate, "yyyy-MM-dd"))?.slotCount} slots available)
                  </span>
                )}
              </p>
            )}

            {/* Availability Legend */}
            <div className="mt-4 pt-4 border-t space-y-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">Availability:</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[hsl(142,76%,36%)]"></div>
                  <span>Many slots</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[hsl(48,96%,53%)]"></div>
                  <span>Few left</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[hsl(0,84%,60%)]"></div>
                  <span>Almost full</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-3 h-3 opacity-40" />
                  <span>Unavailable</span>
                </div>
              </div>
            </div>

            {/* Timezone Warning */}
            {hostTimezone && hostTimezone !== guestTimezone && (
              <TimezoneWarning 
                guestTimezone={guestTimezone} 
                hostTimezone={hostTimezone} 
              />
            )}
          </div>
        </Card>

        {/* Time Slots Section - Right Side (60%) */}
        <Card className="p-6 lg:col-span-3 bg-card/95 backdrop-blur">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Clock className="h-4 w-4 text-primary" />
                <span>Select a Time</span>
              </div>
              {selectedDate && (
                <span className="text-xs text-muted-foreground font-medium">
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
                <AnimatePresence mode="popLayout">
                  {availableSlots.map((slot, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Button
                        variant={selectedSlot?.start === slot.start ? "default" : "outline"}
                        className={cn(
                          "w-full justify-start text-left h-12 transition-all font-medium",
                          selectedSlot?.start === slot.start
                            ? "ring-2 ring-primary bg-primary text-primary-foreground shadow-md scale-[1.02]"
                            : "hover:bg-accent hover:text-accent-foreground border-border/60 hover:scale-[1.01]"
                        )}
                        onClick={() => handleTimeSelect(slot)}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        <span className="text-base">{formatTimeOnly(slot.start)}</span>
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
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
