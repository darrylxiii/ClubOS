import { describe, it, expect } from 'vitest';
import { 
  calculateEventPosition, 
  getOverlappingEvents, 
  calculateOverlappingPositions,
  getEventColor,
  groupEventsByDate 
} from '../calendarLayout';
import { UnifiedCalendarEvent } from '@/types/calendar';

// Helper to create test events
const createEvent = (
  id: string, 
  startHour: number, 
  startMinute: number,
  endHour: number,
  endMinute: number,
  date: Date = new Date('2024-01-15')
): UnifiedCalendarEvent => ({
  id,
  title: `Event ${id}`,
  start: new Date(date.getFullYear(), date.getMonth(), date.getDate(), startHour, startMinute),
  end: new Date(date.getFullYear(), date.getMonth(), date.getDate(), endHour, endMinute),
  source: 'quantum_club',
} as UnifiedCalendarEvent);

describe('calendarLayout', () => {
  describe('calculateEventPosition', () => {
    it('should calculate top position based on start time', () => {
      const event = createEvent('1', 9, 0, 10, 0);
      const position = calculateEventPosition(event, 60, 8);
      
      expect(position.top).toBe(60); // 1 hour after 8am = 60px
    });

    it('should calculate height based on duration', () => {
      const event = createEvent('1', 9, 0, 11, 0);
      const position = calculateEventPosition(event, 60, 8);
      
      expect(position.height).toBe(120); // 2 hours = 120px
    });

    it('should handle minute offsets', () => {
      const event = createEvent('1', 9, 30, 10, 30);
      const position = calculateEventPosition(event, 60, 8);
      
      expect(position.top).toBe(90); // 1.5 hours after 8am = 90px
    });

    it('should have minimum height of 30px', () => {
      const event = createEvent('1', 9, 0, 9, 15);
      const position = calculateEventPosition(event, 60, 8);
      
      expect(position.height).toBeGreaterThanOrEqual(30);
    });

    it('should default width to 100%', () => {
      const event = createEvent('1', 9, 0, 10, 0);
      const position = calculateEventPosition(event, 60, 8);
      
      expect(position.width).toBe(100);
    });
  });

  describe('getOverlappingEvents', () => {
    it('should return empty array for no events', () => {
      const result = getOverlappingEvents([], new Date('2024-01-15'));
      expect(result).toHaveLength(0);
    });

    it('should group non-overlapping events together', () => {
      const events = [
        createEvent('1', 9, 0, 10, 0),
        createEvent('2', 11, 0, 12, 0),
      ];
      const result = getOverlappingEvents(events, new Date('2024-01-15'));
      
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(2);
    });

    it('should separate overlapping events into different groups', () => {
      const events = [
        createEvent('1', 9, 0, 11, 0),
        createEvent('2', 10, 0, 12, 0),
      ];
      const result = getOverlappingEvents(events, new Date('2024-01-15'));
      
      expect(result).toHaveLength(2);
    });

    it('should filter events by date', () => {
      const events = [
        createEvent('1', 9, 0, 10, 0, new Date('2024-01-15')),
        createEvent('2', 11, 0, 12, 0, new Date('2024-01-16')),
      ];
      const result = getOverlappingEvents(events, new Date('2024-01-15'));
      
      expect(result.flat()).toHaveLength(1);
    });
  });

  describe('calculateOverlappingPositions', () => {
    it('should return empty map for no events', () => {
      const result = calculateOverlappingPositions([]);
      expect(result.size).toBe(0);
    });

    it('should give full width to non-overlapping events', () => {
      const events = [
        createEvent('1', 9, 0, 10, 0),
        createEvent('2', 11, 0, 12, 0),
      ];
      const result = calculateOverlappingPositions(events);
      
      expect(result.get('1')?.width).toBe(100);
      expect(result.get('2')?.width).toBe(100);
    });

    it('should split width for overlapping events', () => {
      const events = [
        createEvent('1', 9, 0, 11, 0),
        createEvent('2', 10, 0, 12, 0),
      ];
      const result = calculateOverlappingPositions(events);
      
      expect(result.get('1')?.width).toBe(50);
      expect(result.get('2')?.width).toBe(50);
    });

    it('should set left position for columns', () => {
      const events = [
        createEvent('1', 9, 0, 11, 0),
        createEvent('2', 10, 0, 12, 0),
      ];
      const result = calculateOverlappingPositions(events);
      
      expect(result.get('1')?.left).toBe(0);
      expect(result.get('2')?.left).toBe(50);
    });
  });

  describe('getEventColor', () => {
    it('should return primary color for quantum_club events', () => {
      const event = createEvent('1', 9, 0, 10, 0);
      event.source = 'quantum_club';
      
      expect(getEventColor(event)).toContain('var(--primary)');
    });

    it('should return blue for google events', () => {
      const event = createEvent('1', 9, 0, 10, 0);
      event.source = 'google';
      
      expect(getEventColor(event)).toBe('#3B82F6');
    });

    it('should return green for microsoft events', () => {
      const event = createEvent('1', 9, 0, 10, 0);
      event.source = 'microsoft';
      
      expect(getEventColor(event)).toBe('#10B981');
    });

    it('should return muted color for unknown sources', () => {
      const event = createEvent('1', 9, 0, 10, 0);
      (event as any).source = 'unknown';
      
      expect(getEventColor(event)).toContain('var(--muted)');
    });
  });

  describe('groupEventsByDate', () => {
    it('should group events by date', () => {
      const events = [
        createEvent('1', 9, 0, 10, 0, new Date('2024-01-15')),
        createEvent('2', 11, 0, 12, 0, new Date('2024-01-15')),
        createEvent('3', 9, 0, 10, 0, new Date('2024-01-16')),
      ];
      const result = groupEventsByDate(events);
      
      expect(result.size).toBe(2);
    });

    it('should return empty map for no events', () => {
      const result = groupEventsByDate([]);
      expect(result.size).toBe(0);
    });
  });
});
