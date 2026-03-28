import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface AvailabilityCalendarProps {
  strategistId: string | undefined;
  strategistName: string;
  className?: string;
}

interface DaySlot {
  date: string;
  dayName: string;
  dayShort: string;
  slots: string[];
}

function getNext5BusinessDays(): { date: string; dayName: string; dayShort: string }[] {
  const days: { date: string; dayName: string; dayShort: string }[] = [];
  const current = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayShorts = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  while (days.length < 5) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      days.push({
        date: current.toISOString().split('T')[0],
        dayName: dayNames[dayOfWeek],
        dayShort: dayShorts[dayOfWeek],
      });
    }
  }
  return days;
}

export function AvailabilityCalendar({
  strategistId,
  strategistName,
  className,
}: AvailabilityCalendarProps) {
  const { t } = useTranslation('partner');

  const businessDays = useMemo(() => getNext5BusinessDays(), []);

  // Try to fetch availability from meetings table
  const { data: existingMeetings, isLoading } = useQuery({
    queryKey: ['strategist-availability', strategistId],
    queryFn: async () => {
      if (!strategistId) return [];
      try {
        const startDate = businessDays[0]?.date;
        const endDate = businessDays[businessDays.length - 1]?.date;
        if (!startDate || !endDate) return [];

        const { data, error } = await supabase
          .from('meetings')
          .select('id, scheduled_at, duration_minutes')
          .eq('organizer_id', strategistId)
          .gte('scheduled_at', `${startDate}T00:00:00`)
          .lte('scheduled_at', `${endDate}T23:59:59`)
          .order('scheduled_at', { ascending: true });

        if (error) throw error;
        return data || [];
      } catch (err) {
        console.error('[AvailabilityCalendar] Error fetching meetings:', err);
        return [];
      }
    },
    enabled: !!strategistId,
  });

  // Build day slots - show open slots based on gaps in scheduled meetings
  const daySlots: DaySlot[] = useMemo(() => {
    const defaultSlots = ['9:00 AM', '10:30 AM', '1:00 PM', '2:30 PM', '4:00 PM'];
    const bookedByDay: Record<string, Set<number>> = {};

    (existingMeetings || []).forEach((m: any) => {
      const date = new Date(m.scheduled_at);
      const dateStr = date.toISOString().split('T')[0];
      if (!bookedByDay[dateStr]) bookedByDay[dateStr] = new Set();
      bookedByDay[dateStr].add(date.getHours());
    });

    return businessDays.map((day) => {
      const booked = bookedByDay[day.date] || new Set();
      const slotHours = [9, 10, 13, 14, 16];
      const available = defaultSlots.filter((_, i) => !booked.has(slotHours[i]));
      return {
        ...day,
        slots: available,
      };
    });
  }, [businessDays, existingMeetings]);

  const hasAnySlots = daySlots.some((d) => d.slots.length > 0);

  if (isLoading) {
    return (
      <div className={`rounded-xl bg-card/30 backdrop-blur border border-border/20 p-4 space-y-3 ${className || ''}`}>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl bg-card/30 backdrop-blur border border-border/20 p-4 space-y-4 ${className || ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">
            {t('strategist.availability', 'Availability')}
          </h3>
        </div>
        <Badge variant="outline" className="text-[10px]">
          {t('strategist.next5Days', 'Next 5 business days')}
        </Badge>
      </div>

      {/* Day slots */}
      {!hasAnySlots ? (
        <div className="text-center py-6 space-y-2">
          <Clock className="h-8 w-8 mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {t(
              'strategist.noAvailability',
              'Contact {{name}} to schedule a call',
              { name: strategistName }
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {daySlots.map((day, index) => (
            <motion.div
              key={day.date}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.2 }}
              className="flex items-start gap-3 p-2 rounded-lg hover:bg-card/30 transition-colors"
            >
              <div className="w-10 text-center shrink-0 pt-0.5">
                <p className="text-[10px] text-muted-foreground uppercase">
                  {day.dayShort}
                </p>
                <p className="text-sm font-semibold">
                  {new Date(day.date + 'T12:00:00').getDate()}
                </p>
              </div>
              <div className="flex-1 flex flex-wrap gap-1.5">
                {day.slots.length === 0 ? (
                  <span className="text-xs text-muted-foreground italic py-1">
                    {t('strategist.noSlots', 'No open slots')}
                  </span>
                ) : (
                  day.slots.map((slot) => (
                    <Badge
                      key={`${day.date}-${slot}`}
                      variant="secondary"
                      className="text-[10px] px-2 py-0.5 cursor-default"
                    >
                      <Clock className="h-2.5 w-2.5 mr-1" />
                      {slot}
                    </Badge>
                  ))
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Book a call CTA */}
      <div className="pt-2 border-t border-border/20">
        <Button variant="outline" size="sm" className="w-full" asChild>
          <a href="/meetings" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            {t('strategist.bookCall', 'Book a Call')}
          </a>
        </Button>
      </div>
    </div>
  );
}
