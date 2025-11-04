import { UnifiedCalendarEvent } from "@/types/calendar";
import { Card } from "@/components/ui/card";
import { calculateOverlappingPositions, getEventColor } from "@/utils/calendarLayout";
import { format, isSameDay, startOfDay, addDays, startOfWeek } from "date-fns";
import { Clock, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { isLiveMeeting } from "@/utils/meetingStatus";

interface CalendarWeekGridProps {
  events: UnifiedCalendarEvent[];
  selectedDate: Date;
  onEventClick: (event: UnifiedCalendarEvent) => void;
}

const HOUR_HEIGHT = 60;
const START_HOUR = 8;
const END_HOUR = 20;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

export function CalendarWeekGrid({ events, selectedDate, onEventClick }: CalendarWeekGridProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Get the week start (Monday)
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Group events by day
  const eventsByDay = weekDays.map(day => ({
    date: day,
    events: events.filter(event => isSameDay(startOfDay(event.start), startOfDay(day)))
  }));

  const isToday = (date: Date) => isSameDay(date, new Date());
  const currentDayIndex = weekDays.findIndex(day => isToday(day));
  const currentHourOffset = currentDayIndex >= 0
    ? ((currentTime.getHours() - START_HOUR) + (currentTime.getMinutes() / 60)) * HOUR_HEIGHT
    : null;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col">
        {/* Day headers */}
        <div className="flex border-b border-border sticky top-0 bg-background z-30">
          {/* Time column header */}
          <div className="w-14 flex-shrink-0 border-r border-border/50 py-2 px-2">
            <div className="text-xs text-muted-foreground"></div>
          </div>
          
          {/* Day columns */}
          {weekDays.map((day, index) => {
            const isTodayDate = isToday(day);
            return (
              <div
                key={day.toISOString()}
                className={`flex-1 min-w-0 py-2 px-2 text-center border-r border-border/30 last:border-r-0 ${
                  isTodayDate ? 'bg-primary/5' : ''
                }`}
              >
                <div className="text-xs font-medium text-muted-foreground">
                  {format(day, 'EEE')}
                </div>
                <div className={`text-lg font-semibold mt-0.5 ${
                  isTodayDate ? 'text-primary' : ''
                }`}>
                  {format(day, 'd')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="relative overflow-x-auto">
          <div className="flex" style={{ minHeight: `${HOUR_HEIGHT * HOURS.length}px` }}>
            {/* Time labels column */}
            <div className="w-14 flex-shrink-0 border-r border-border/50 relative">
              {HOURS.map(hour => (
                <div
                  key={hour}
                  className="h-[60px] px-1 flex items-start justify-end text-xs text-muted-foreground"
                >
                  <span className="pr-1">{format(new Date().setHours(hour, 0), 'h a')}</span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {eventsByDay.map(({ date, events: dayEvents }, dayIndex) => {
              const positions = calculateOverlappingPositions(dayEvents, HOUR_HEIGHT, START_HOUR);
              const isTodayDate = isToday(date);
              
              return (
                <div
                  key={date.toISOString()}
                  className={`flex-1 min-w-0 relative border-r border-border/30 last:border-r-0 ${
                    isTodayDate ? 'bg-primary/5' : ''
                  }`}
                >
                  {/* Hour lines */}
                  {HOURS.map(hour => (
                    <div
                      key={hour}
                      className="h-[60px] border-b border-border/20"
                    />
                  ))}

                  {/* Current time indicator */}
                  {isTodayDate && currentHourOffset !== null && currentHourOffset >= 0 && (
                    <div
                      className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                      style={{ top: `${currentHourOffset}px` }}
                    >
                      <div className="flex-1 h-0.5 bg-red-500 relative">
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-red-500 rounded-full" />
                      </div>
                    </div>
                  )}

                  {/* Events */}
                  <div className="absolute inset-0 px-0.5">
                    {dayEvents.map(event => {
                      const position = positions.get(event.id);
                      if (!position) return null;

                      const isLive = isLiveMeeting(event);
                      const bgColor = getEventColor(event);

                      return (
                        <button
                          key={event.id}
                          onClick={() => onEventClick(event)}
                          className="absolute rounded-md border transition-all hover:shadow-lg hover:z-50 overflow-hidden group"
                          style={{
                            top: `${position.top}px`,
                            height: `${position.height}px`,
                            left: `${position.left}%`,
                            width: `${position.width}%`,
                            backgroundColor: `${bgColor}15`,
                            borderColor: bgColor,
                            zIndex: position.zIndex,
                          }}
                        >
                          <div className="p-1.5 h-full overflow-hidden flex flex-col text-left">
                            <div className="flex items-start gap-0.5">
                              {event.has_club_ai && (
                                <Sparkles className="h-2.5 w-2.5 text-amber-500 fill-amber-500 flex-shrink-0 mt-0.5" />
                              )}
                              {isLive && (
                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse flex-shrink-0 mt-1" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-[11px] leading-tight truncate">
                                  {event.title}
                                </div>
                                <div className="text-[9px] text-muted-foreground mt-0.5">
                                  {format(event.start, 'h:mm a')}
                                </div>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Empty state for day */}
                  {dayEvents.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <div className="text-center text-muted-foreground">
                        <Clock className="h-6 w-6 mx-auto mb-1 opacity-30" />
                        <p className="text-[10px]">No events</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
