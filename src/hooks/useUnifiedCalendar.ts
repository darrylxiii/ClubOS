import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UnifiedCalendarEvent, CalendarFilters } from '@/types/calendar';
import { fetchUnifiedCalendarEvents } from '@/services/calendarAggregation';
import { supabase } from '@/integrations/supabase/client';

export function useUnifiedCalendar(selectedDate: Date = new Date()) {
  const { user } = useAuth();
  const [events, setEvents] = useState<UnifiedCalendarEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<UnifiedCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CalendarFilters>({
    quantum_club: true,
    google: true,
    microsoft: true,
  });

  const loadEvents = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch events for the month surrounding the selected date
      const startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59);

      const fetchedEvents = await fetchUnifiedCalendarEvents(user.id, startDate, endDate);
      setEvents(fetchedEvents);
    } catch (error) {
      console.error('Failed to load calendar events:', error);
    } finally {
      setLoading(false);
    }
  }, [user, selectedDate]);

  useEffect(() => {
    loadEvents();

    // Subscribe to Quantum Club meetings changes
    const channel = supabase
      .channel('meetings-realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'meetings' },
        () => loadEvents()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedDate, loadEvents]);

  // Apply filters
  useEffect(() => {
    const filtered = events.filter(event => {
      if (event.source === 'quantum_club') return filters.quantum_club;
      if (event.source === 'google') return filters.google;
      if (event.source === 'microsoft') return filters.microsoft;
      return true;
    });
    setFilteredEvents(filtered);
  }, [events, filters]);

  const toggleFilter = (source: keyof CalendarFilters) => {
    setFilters(prev => ({ ...prev, [source]: !prev[source] }));
  };

  return {
    events: filteredEvents,
    loading,
    filters,
    toggleFilter,
    refreshEvents: loadEvents,
  };
}
