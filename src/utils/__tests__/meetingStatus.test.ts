import { describe, it, expect } from 'vitest';
import { 
  getMeetingStatus, 
  formatCountdown, 
  formatRelativeTime,
  isLiveMeeting,
  canJoinMeeting 
} from '../meetingStatus';
import { UnifiedCalendarEvent } from '@/types/calendar';

// Helper to create test events
const createMeetingEvent = (
  startOffset: number, // minutes from now
  duration: number = 60 // minutes
): UnifiedCalendarEvent => {
  const now = new Date();
  const start = new Date(now.getTime() + startOffset * 60 * 1000);
  const end = new Date(start.getTime() + duration * 60 * 1000);
  
  return {
    id: 'test-meeting',
    title: 'Test Meeting',
    start,
    end,
    source: 'quantum_club',
    is_quantum_club: true,
    meeting_id: 'meeting-123',
    has_club_ai: false,
    color: '#000',
  } as UnifiedCalendarEvent;
};

describe('meetingStatus', () => {
  describe('getMeetingStatus', () => {
    it('should return "ended" for past meetings', () => {
      const event = createMeetingEvent(-120, 60); // Started 2 hours ago, lasted 1 hour
      const status = getMeetingStatus(event);
      
      expect(status.status).toBe('ended');
      expect(status.canJoin).toBe(false);
    });

    it('should return "live" for ongoing meetings', () => {
      const event = createMeetingEvent(-30, 60); // Started 30 mins ago, 30 mins left
      const status = getMeetingStatus(event);
      
      expect(status.status).toBe('live');
      expect(status.canJoin).toBe(true);
      expect(status.buttonText).toBe('Join Meeting');
    });

    it('should return "ending-soon" for meetings ending in 10 mins or less', () => {
      const event = createMeetingEvent(-55, 60); // Started 55 mins ago, 5 mins left
      const status = getMeetingStatus(event);
      
      expect(status.status).toBe('ending-soon');
      expect(status.canJoin).toBe(true);
    });

    it('should return "starting-soon" for meetings starting within 15 mins', () => {
      const event = createMeetingEvent(10, 60); // Starts in 10 mins
      const status = getMeetingStatus(event);
      
      expect(status.status).toBe('starting-soon');
      expect(status.countdown).toBeDefined();
    });

    it('should allow early join for meetings starting in 5 mins or less', () => {
      const event = createMeetingEvent(3, 60); // Starts in 3 mins
      const status = getMeetingStatus(event);
      
      expect(status.canJoin).toBe(true);
      expect(status.buttonText).toBe('Join Early');
    });

    it('should return "upcoming" for meetings starting more than 15 mins away', () => {
      const event = createMeetingEvent(30, 60); // Starts in 30 mins
      const status = getMeetingStatus(event);
      
      expect(status.status).toBe('upcoming');
      expect(status.canJoin).toBe(false);
    });

    it('should show "View Recording" for ended meetings with insights', () => {
      const event = createMeetingEvent(-120, 60);
      event.insights_available = true;
      const status = getMeetingStatus(event);
      
      expect(status.buttonText).toBe('View Recording');
    });
  });

  describe('formatCountdown', () => {
    it('should return "Starting now" for less than 1 minute', () => {
      expect(formatCountdown(0)).toBe('Starting now');
      expect(formatCountdown(0.5)).toBe('Starting now');
    });

    it('should return singular form for 1 minute', () => {
      expect(formatCountdown(1)).toBe('1 minute');
    });

    it('should return plural form for multiple minutes', () => {
      expect(formatCountdown(5)).toBe('5 minutes');
      expect(formatCountdown(30)).toBe('30 minutes');
    });

    it('should return hours for 60+ minutes', () => {
      expect(formatCountdown(60)).toBe('1 hour');
      expect(formatCountdown(120)).toBe('2 hours');
    });

    it('should return combined format for hours and minutes', () => {
      expect(formatCountdown(90)).toBe('1h 30m');
      expect(formatCountdown(150)).toBe('2h 30m');
    });
  });

  describe('formatRelativeTime', () => {
    it('should format minutes correctly', () => {
      const future = new Date(Date.now() + 30 * 60 * 1000);
      expect(formatRelativeTime(future)).toContain('minute');
    });

    it('should format hours correctly', () => {
      const future = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const result = formatRelativeTime(future);
      expect(result).toContain('hour');
    });

    it('should format days correctly', () => {
      const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      const result = formatRelativeTime(future);
      expect(result).toContain('day');
    });

    it('should use singular for 1 minute/hour/day', () => {
      const oneMinute = new Date(Date.now() + 1 * 60 * 1000);
      expect(formatRelativeTime(oneMinute)).toBe('in 1 minute');
    });
  });

  describe('isLiveMeeting', () => {
    it('should return true for ongoing meetings', () => {
      const event = createMeetingEvent(-30, 60);
      expect(isLiveMeeting(event)).toBe(true);
    });

    it('should return false for future meetings', () => {
      const event = createMeetingEvent(30, 60);
      expect(isLiveMeeting(event)).toBe(false);
    });

    it('should return false for past meetings', () => {
      const event = createMeetingEvent(-120, 60);
      expect(isLiveMeeting(event)).toBe(false);
    });
  });

  describe('canJoinMeeting', () => {
    it('should return true for joinable TQC meetings', () => {
      const event = createMeetingEvent(-5, 60); // Live meeting
      expect(canJoinMeeting(event)).toBe(true);
    });

    it('should return false for non-TQC meetings', () => {
      const event = createMeetingEvent(-5, 60);
      event.is_quantum_club = false;
      expect(canJoinMeeting(event)).toBe(false);
    });

    it('should return false for meetings without meeting_id', () => {
      const event = createMeetingEvent(-5, 60);
      event.meeting_id = undefined;
      expect(canJoinMeeting(event)).toBe(false);
    });

    it('should return false for upcoming meetings', () => {
      const event = createMeetingEvent(30, 60);
      expect(canJoinMeeting(event)).toBe(false);
    });
  });
});
