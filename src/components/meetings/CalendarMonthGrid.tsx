import { UnifiedCalendarEvent } from "@/types/calendar";
import { Card } from "@/components/ui/card";
import { 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, format, isSameMonth, isSameDay, isToday 
} from "date-fns";
import { getEventColor } from "@/utils/calendarLayout";
import { cn } from "@/lib/utils";

interface CalendarMonthGridProps {
  events: UnifiedCalendarEvent[];
  selectedDate: Date;
  onDateClick: (date: Date) => void;
  onEventClick: (event: UnifiedCalendarEvent) => void;
}

export function CalendarMonthGrid({ 
  events, 
  selectedDate, 
  onDateClick,
  onEventClick 
}: CalendarMonthGridProps) {
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weeks: Date[][] = [];
  
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(event.start, day));
  };

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border/50">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} className="p-3 text-center text-sm font-semibold border-r border-border/30 last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-rows-[repeat(auto-fit,minmax(100px,1fr))]">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 border-b border-border/30 last:border-b-0">
            {week.map(day => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, selectedDate);
              const isTodayDate = isToday(day);
              const isSelected = isSameDay(day, selectedDate);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => onDateClick(day)}
                  className={cn(
                    "min-h-[100px] p-2 border-r border-border/30 last:border-r-0 text-left transition-colors hover:bg-muted/50",
                    !isCurrentMonth && "bg-muted/20 text-muted-foreground",
                    isTodayDate && "bg-primary/5",
                    isSelected && "ring-2 ring-primary ring-inset"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn(
                      "text-sm font-medium",
                      isTodayDate && "text-primary font-bold"
                    )}>
                      {format(day, 'd')}
                    </span>
                    {isTodayDate && (
                      <span className="text-[10px] font-semibold text-primary">TODAY</span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map(event => (
                      <button
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(event);
                        }}
                        className="w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate transition-all hover:scale-105"
                        style={{
                          backgroundColor: `${getEventColor(event)}20`,
                          borderLeft: `3px solid ${getEventColor(event)}`,
                        }}
                      >
                        {format(event.start, 'h:mm')} {event.title}
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-muted-foreground font-medium px-1.5">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </Card>
  );
}
