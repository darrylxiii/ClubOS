import { useState } from "react";
import { useUnifiedCalendar } from "@/hooks/useUnifiedCalendar";
import { useCalendarView } from "@/hooks/useCalendarView";
import { CalendarSidebar } from "./CalendarSidebar";
import { CalendarViewSwitcher } from "./CalendarViewSwitcher";
import { CalendarTimeGrid } from "./CalendarTimeGrid";
import { CalendarWeekGrid } from "./CalendarWeekGrid";
import { CalendarMonthGrid } from "./CalendarMonthGrid";
import { CalendarListView } from "./CalendarListView";
import { EventDetailModal } from "./EventDetailModal";
import { Skeleton } from "@/components/ui/skeleton";
import { UnifiedCalendarEvent } from "@/types/calendar";

export function UnifiedCalendarView() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { events, loading, filters, toggleFilter, refreshEvents } = useUnifiedCalendar(selectedDate);
  const { viewMode, changeView, showEventModal, selectedEventId, openEventModal, closeEventModal } = useCalendarView('week');

  const selectedEvent = events.find(e => e.id === selectedEventId) || null;

  const handleEventClick = (event: UnifiedCalendarEvent) => {
    openEventModal(event.id);
  };

  const renderView = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      );
    }

    switch (viewMode) {
      case 'day':
        return (
          <CalendarTimeGrid 
            events={events} 
            date={selectedDate}
            onEventClick={handleEventClick}
          />
        );
      
      case 'week':
        return (
          <CalendarWeekGrid 
            events={events}
            selectedDate={selectedDate}
            onEventClick={handleEventClick}
          />
        );
      
      case 'month':
        return (
          <CalendarMonthGrid 
            events={events}
            selectedDate={selectedDate}
            onDateClick={setSelectedDate}
            onEventClick={handleEventClick}
          />
        );
      
      case 'list':
        return (
          <CalendarListView 
            events={events}
            onEventClick={handleEventClick}
          />
        );
      
      default:
        return null;
    }
  };

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
        <CalendarViewSwitcher
          viewMode={viewMode}
          onViewChange={changeView}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
        />

        {renderView()}
      </div>

      <EventDetailModal
        event={selectedEvent}
        open={showEventModal}
        onOpenChange={closeEventModal}
      />
    </div>
  );
}
