import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addDays, startOfDay } from "date-fns";
import { useUnifiedCalendar } from "@/hooks/useUnifiedCalendar";
import { CalendarSidebar } from "./CalendarSidebar";
import { CalendarEventCard } from "./CalendarEventCard";
import { Skeleton } from "@/components/ui/skeleton";

export function UnifiedCalendarView() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
  const { events, loading, filters, toggleFilter, refreshEvents } = useUnifiedCalendar(selectedDate);

  const navigateDate = (direction: 'prev' | 'next') => {
    const days = viewMode === 'day' ? 1 : 7;
    setSelectedDate(prev => addDays(prev, direction === 'prev' ? -days : days));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const getDaysToShow = () => {
    if (viewMode === 'day') {
      return [selectedDate];
    }
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  };

  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(startOfDay(event.start), startOfDay(day)));
  };

  const days = getDaysToShow();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
      <CalendarSidebar
        selectedDate={selectedDate}
        onDateSelect={(date) => date && setSelectedDate(date)}
        filters={filters}
        onToggleFilter={toggleFilter}
        onRefresh={refreshEvents}
      />

      <div className="space-y-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => navigateDate('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={goToToday}>
                Today
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigateDate('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <h2 className="text-xl font-semibold">
              {viewMode === 'day' 
                ? format(selectedDate, 'EEEE, MMMM d, yyyy')
                : `${format(days[0], 'MMM d')} - ${format(days[days.length - 1], 'MMM d, yyyy')}`
              }
            </h2>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant={viewMode === 'day' ? 'default' : 'outline'}
                onClick={() => setViewMode('day')}
              >
                Day
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'week' ? 'default' : 'outline'}
                onClick={() => setViewMode('week')}
              >
                Week
              </Button>
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : (
          <div className={viewMode === 'week' ? 'grid grid-cols-1 md:grid-cols-7 gap-4' : 'space-y-4'}>
            {days.map(day => {
              const dayEvents = getEventsForDay(day);
              const isToday = isSameDay(day, new Date());

              return (
                <div key={day.toISOString()} className="space-y-3">
                  <Card className={`p-3 ${isToday ? 'border-primary' : ''}`}>
                    <h3 className="font-semibold text-center">
                      {format(day, 'EEE')}
                    </h3>
                    <p className={`text-2xl font-bold text-center ${isToday ? 'text-primary' : ''}`}>
                      {format(day, 'd')}
                    </p>
                  </Card>

                  <div className="space-y-2">
                    {dayEvents.length === 0 ? (
                      <Card className="p-4 text-center text-sm text-muted-foreground">
                        No events
                      </Card>
                    ) : (
                      dayEvents.map(event => (
                        <CalendarEventCard key={event.id} event={event} />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
