import { UnifiedCalendarEvent } from "@/types/calendar";
import { Card } from "@/components/ui/card";
import { calculateOverlappingPositions, getEventColor } from "@/utils/calendarLayout";
import { format, isSameDay, startOfDay } from "date-fns";
import { Clock, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { isLiveMeeting } from "@/utils/meetingStatus";

interface CalendarTimeGridProps {
  events: UnifiedCalendarEvent[];
  date: Date;
  onEventClick: (event: UnifiedCalendarEvent) => void;
}

const HOUR_HEIGHT = 60;
const START_HOUR = 8;
const END_HOUR = 20;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

export function CalendarTimeGrid({ events, date, onEventClick }: CalendarTimeGridProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const dayEvents = events.filter(event => 
    isSameDay(startOfDay(event.start), startOfDay(date))
  );

  const positions = calculateOverlappingPositions(dayEvents, HOUR_HEIGHT, START_HOUR);

  const isToday = isSameDay(date, new Date());
  const currentHourOffset = isToday 
    ? ((currentTime.getHours() - START_HOUR) + (currentTime.getMinutes() / 60)) * HOUR_HEIGHT
    : null;

  return (
    <div className="relative">
      <Card className="overflow-hidden">
        <div className="relative" style={{ height: `${HOUR_HEIGHT * HOURS.length}px` }}>
          {/* Time labels */}
          <div className="absolute left-0 top-0 w-16 h-full border-r border-border/50">
            {HOURS.map(hour => (
              <div
                key={hour}
                className="h-[60px] px-2 py-1 text-xs text-muted-foreground border-b border-border/30"
              >
                {format(new Date().setHours(hour, 0), 'h a')}
              </div>
            ))}
          </div>

          {/* Grid lines */}
          <div className="absolute left-16 top-0 right-0 h-full">
            {HOURS.map(hour => (
              <div
                key={hour}
                className="h-[60px] border-b border-border/30"
              />
            ))}
          </div>

          {/* Current time indicator */}
          {isToday && currentHourOffset !== null && currentHourOffset >= 0 && (
            <div
              className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
              style={{ top: `${currentHourOffset}px` }}
            >
              <div className="w-16 flex justify-end pr-2">
                <div className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                  {format(currentTime, 'h:mm')}
                </div>
              </div>
              <div className="flex-1 h-0.5 bg-red-500 relative">
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-red-500 rounded-full" />
              </div>
            </div>
          )}

          {/* Events */}
          <div className="absolute left-16 top-0 right-0 h-full">
            {dayEvents.map(event => {
              const position = positions.get(event.id);
              if (!position) return null;

              const isLive = isLiveMeeting(event);
              const bgColor = getEventColor(event);

              return (
                <button
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className="absolute rounded-lg border-2 transition-all hover:shadow-lg hover:scale-[1.02] overflow-hidden group"
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
                  <div className="p-2 h-full overflow-hidden flex flex-col">
                    <div className="flex items-start gap-1 mb-1">
                      {event.has_club_ai && (
                        <Sparkles className="h-3 w-3 text-amber-500 fill-amber-500 flex-shrink-0" />
                      )}
                      {isLive && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-xs truncate">{event.title}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {format(event.start, 'h:mm a')}
                        </div>
                      </div>
                    </div>
                    {position.height > 40 && event.location && (
                      <div className="text-[10px] text-muted-foreground truncate">
                        {event.location}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Empty state */}
          {dayEvents.length === 0 && (
            <div className="absolute left-16 top-0 right-0 h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No events scheduled</p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
