import { useState, useCallback } from 'react';
import { UnifiedCalendarEvent } from '@/types/calendar';
import { fetchUnifiedCalendarEvents } from '@/services/calendarAggregation';

export interface ConflictResult {
  hasConflict: boolean;
  conflictingEvents: UnifiedCalendarEvent[];
  severity: 'warning' | 'error'; // error = existing TQC meeting, warning = external calendar
}

export function useCalendarConflictDetection() {
  const [isChecking, setIsChecking] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictResult | null>(null);

  const checkConflicts = useCallback(async (
    userId: string,
    proposedStart: Date,
    proposedEnd: Date,
    excludeMeetingId?: string
  ): Promise<ConflictResult> => {
    setIsChecking(true);
    
    try {
      // Expand the search window by 1 day on each side to catch edge cases
      const searchStart = new Date(proposedStart);
      searchStart.setDate(searchStart.getDate() - 1);
      const searchEnd = new Date(proposedEnd);
      searchEnd.setDate(searchEnd.getDate() + 1);

      const events = await fetchUnifiedCalendarEvents(userId, searchStart, searchEnd);
      
      // Filter to find overlapping events
      const overlapping = events.filter(event => {
        // Skip the meeting we're editing
        if (excludeMeetingId && event.meeting_id === excludeMeetingId) {
          return false;
        }
        
        // Check for overlap: event starts before proposed end AND event ends after proposed start
        return event.start < proposedEnd && event.end > proposedStart;
      });

      const result: ConflictResult = {
        hasConflict: overlapping.length > 0,
        conflictingEvents: overlapping,
        severity: overlapping.some(e => e.is_quantum_club) ? 'error' : 'warning',
      };

      setConflicts(result);
      return result;
    } catch (error) {
      console.error('Failed to check conflicts:', error);
      return {
        hasConflict: false,
        conflictingEvents: [],
        severity: 'warning',
      };
    } finally {
      setIsChecking(false);
    }
  }, []);

  const clearConflicts = useCallback(() => {
    setConflicts(null);
  }, []);

  return {
    checkConflicts,
    clearConflicts,
    conflicts,
    isChecking,
  };
}
