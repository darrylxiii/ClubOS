import { UnifiedCalendarEvent } from "@/types/calendar";
import { isSameDay, startOfDay } from "date-fns";

export interface EventPosition {
  top: number;
  height: number;
  left: number;
  width: number;
  zIndex: number;
}

export function calculateEventPosition(
  event: UnifiedCalendarEvent,
  hourHeight: number = 60,
  dayStartHour: number = 8
): EventPosition {
  const startHour = event.start.getHours();
  const startMinute = event.start.getMinutes();
  const endHour = event.end.getHours();
  const endMinute = event.end.getMinutes();

  const startOffset = (startHour - dayStartHour) + (startMinute / 60);
  const duration = (endHour - startHour) + ((endMinute - startMinute) / 60);

  return {
    top: startOffset * hourHeight,
    height: Math.max(duration * hourHeight, 30),
    left: 0,
    width: 100,
    zIndex: 1,
  };
}

export function getOverlappingEvents(
  events: UnifiedCalendarEvent[],
  date: Date
): UnifiedCalendarEvent[][] {
  const dayEvents = events.filter(event => 
    isSameDay(startOfDay(event.start), startOfDay(date))
  ).sort((a, b) => a.start.getTime() - b.start.getTime());

  const groups: UnifiedCalendarEvent[][] = [];
  
  dayEvents.forEach(event => {
    let placed = false;
    
    for (const group of groups) {
      const hasOverlap = group.some(e => 
        (event.start < e.end && event.end > e.start)
      );
      
      if (!hasOverlap) {
        group.push(event);
        placed = true;
        break;
      }
    }
    
    if (!placed) {
      groups.push([event]);
    }
  });

  return groups;
}

export function calculateOverlappingPositions(
  events: UnifiedCalendarEvent[],
  hourHeight: number = 60,
  dayStartHour: number = 8
): Map<string, EventPosition> {
  const positions = new Map<string, EventPosition>();
  const columns: UnifiedCalendarEvent[][] = [];

  events.forEach(event => {
    let placed = false;
    
    for (let i = 0; i < columns.length; i++) {
      const column = columns[i];
      const hasOverlap = column.some(e => 
        (event.start < e.end && event.end > e.start)
      );
      
      if (!hasOverlap) {
        column.push(event);
        placed = true;
        break;
      }
    }
    
    if (!placed) {
      columns.push([event]);
    }
  });

  const columnWidth = 100 / columns.length;

  columns.forEach((column, columnIndex) => {
    column.forEach(event => {
      const basePosition = calculateEventPosition(event, hourHeight, dayStartHour);
      positions.set(event.id, {
        ...basePosition,
        left: columnIndex * columnWidth,
        width: columnWidth,
        zIndex: columnIndex + 1,
      });
    });
  });

  return positions;
}

export function getEventColor(event: UnifiedCalendarEvent): string {
  if (event.source === 'quantum_club') {
    return 'hsl(var(--primary))';
  }
  if (event.source === 'google') {
    return '#3B82F6';
  }
  if (event.source === 'microsoft') {
    return '#10B981';
  }
  return 'hsl(var(--muted))';
}

export function groupEventsByDate(events: UnifiedCalendarEvent[]): Map<string, UnifiedCalendarEvent[]> {
  const grouped = new Map<string, UnifiedCalendarEvent[]>();
  
  events.forEach(event => {
    const dateKey = startOfDay(event.start).toISOString();
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(event);
  });

  return grouped;
}
