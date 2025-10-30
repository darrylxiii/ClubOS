import { useState, useCallback } from 'react';
import { CalendarViewMode } from '@/types/calendar';

export type ExtendedViewMode = CalendarViewMode | 'list' | 'timeline';

export function useCalendarView(initialView: ExtendedViewMode = 'week') {
  const [viewMode, setViewMode] = useState<ExtendedViewMode>(initialView);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const changeView = useCallback((mode: ExtendedViewMode) => {
    setViewMode(mode);
  }, []);

  const openEventModal = useCallback((eventId: string) => {
    setSelectedEventId(eventId);
    setShowEventModal(true);
  }, []);

  const closeEventModal = useCallback(() => {
    setShowEventModal(false);
    setSelectedEventId(null);
  }, []);

  return {
    viewMode,
    changeView,
    showEventModal,
    selectedEventId,
    openEventModal,
    closeEventModal,
  };
}
