import { UnifiedCalendarEvent } from "@/types/calendar";
import { differenceInMinutes, isPast, isFuture, isWithinInterval } from "date-fns";

export type MeetingStatus = 
  | 'upcoming' 
  | 'starting-soon' 
  | 'live' 
  | 'ending-soon' 
  | 'ended';

export interface MeetingStatusInfo {
  status: MeetingStatus;
  canJoin: boolean;
  buttonText: string;
  countdown?: string;
  description: string;
}

export function getMeetingStatus(event: UnifiedCalendarEvent): MeetingStatusInfo {
  const now = new Date();
  const minutesUntilStart = differenceInMinutes(event.start, now);
  const minutesUntilEnd = differenceInMinutes(event.end, now);

  // Meeting has ended
  if (isPast(event.end)) {
    return {
      status: 'ended',
      canJoin: false,
      buttonText: event.insights_available ? 'View Recording' : 'Meeting Ended',
      description: 'This meeting has ended',
    };
  }

  // Meeting is live
  if (isWithinInterval(now, { start: event.start, end: event.end })) {
    const isEndingSoon = minutesUntilEnd <= 10;
    
    return {
      status: isEndingSoon ? 'ending-soon' : 'live',
      canJoin: true,
      buttonText: 'Join Meeting',
      description: isEndingSoon 
        ? `Ending in ${minutesUntilEnd} minute${minutesUntilEnd !== 1 ? 's' : ''}` 
        : 'Meeting in progress',
    };
  }

  // Meeting starts soon (within 15 minutes)
  if (minutesUntilStart <= 15 && minutesUntilStart > 0) {
    return {
      status: 'starting-soon',
      canJoin: minutesUntilStart <= 5,
      buttonText: minutesUntilStart <= 5 ? 'Join Early' : `Starting in ${minutesUntilStart}m`,
      countdown: formatCountdown(minutesUntilStart),
      description: `Starts in ${minutesUntilStart} minute${minutesUntilStart !== 1 ? 's' : ''}`,
    };
  }

  // Meeting is upcoming
  return {
    status: 'upcoming',
    canJoin: false,
    buttonText: 'View Details',
    description: `Starts ${formatRelativeTime(event.start)}`,
  };
}

export function formatCountdown(minutes: number): string {
  if (minutes < 1) {
    return 'Starting now';
  }
  if (minutes === 1) {
    return '1 minute';
  }
  if (minutes < 60) {
    return `${minutes} minutes`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const minutes = differenceInMinutes(date, now);
  
  if (minutes < 60) {
    return `in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `in ${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  const days = Math.floor(hours / 24);
  return `in ${days} day${days !== 1 ? 's' : ''}`;
}

export function isLiveMeeting(event: UnifiedCalendarEvent): boolean {
  const now = new Date();
  return isWithinInterval(now, { start: event.start, end: event.end });
}

export function canJoinMeeting(event: UnifiedCalendarEvent): boolean {
  if (!event.is_quantum_club || !event.meeting_id) return false;
  
  const statusInfo = getMeetingStatus(event);
  return statusInfo.canJoin;
}
