/**
 * Centralized timezone handling for The Quantum Club booking system
 * Ensures consistency across client and edge functions
 */

import { format, parseISO } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { logger } from '@/lib/logger';

/**
 * Type aliases for time string formats
 * SlotString format: "HH:MM - YYYY-MM-DD" (e.g., "09:00 - 2025-11-13")
 * TimeString format: "H:MM AM/PM" (e.g., "9:00 AM")
 */
export type SlotString = string;
export type TimeString = string;

/**
 * Get user's current timezone using browser API
 * Fallback to Europe/Amsterdam (TQC default)
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Amsterdam';
  } catch (error) {
    logger.warn('Failed to detect timezone, using default', { componentName: 'TimezoneUtils', error });
    return 'Europe/Amsterdam';
  }
}

/**
 * Format a date to ISO string for a specific timezone
 * Use this when sending dates to edge functions
 */
export function formatDateForTimezone(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

/**
 * Format a date range for slot queries
 * Ensures start/end are properly bounded in the target timezone
 */
export function getDateRangeForTimezone(date: Date, timezone: string) {
  const zonedDate = toZonedTime(date, timezone);
  
  // Start of day in target timezone
  const startOfDay = new Date(zonedDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  // End of day in target timezone
  const endOfDay = new Date(zonedDate);
  endOfDay.setHours(23, 59, 59, 999);
  
  return {
    start: format(startOfDay, 'yyyy-MM-dd'),
    end: format(endOfDay, 'yyyy-MM-dd'),
  };
}

/**
 * Format time slot for display in user's timezone
 */
export function formatTimeSlot(isoStart: string, isoEnd: string, timezone: string): string {
  const start = formatInTimeZone(isoStart, timezone, 'h:mm a');
  const end = formatInTimeZone(isoEnd, timezone, 'h:mm a');
  return `${start} - ${end}`;
}

/**
 * Detect time format type
 */
export function detectTimeFormat(timeStr: string): 'am-pm' | '24-hour' | 'invalid' {
  if (/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(timeStr)) {
    return 'am-pm';
  }
  if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
    return '24-hour';
  }
  return 'invalid';
}

/**
 * Normalize time format to 12-hour AM/PM format
 * Accepts both 24-hour ("09:00", "14:30") and 12-hour ("9:00 AM", "2:30 PM") formats
 * Always returns 12-hour AM/PM format for consistency
 */
export function normalizeTimeFormat(timeStr: string): string {
  const format = detectTimeFormat(timeStr);
  
  // Already in correct format
  if (format === 'am-pm') {
    return timeStr;
  }
  
  // Convert 24-hour to 12-hour format
  if (format === '24-hour') {
    const [hoursStr, minutesStr] = timeStr.split(':');
    let hours = parseInt(hoursStr, 10);
    const minutes = minutesStr;
    
    // Determine AM/PM
    const period = hours >= 12 ? 'PM' : 'AM';
    
    // Convert to 12-hour format
    if (hours === 0) {
      hours = 12; // Midnight
    } else if (hours > 12) {
      hours -= 12;
    }
    
    return `${hours}:${minutes} ${period}`;
  }
  
  console.error('[normalizeTimeFormat] Invalid time format:', timeStr);
  return timeStr;
}

/**
 * Parse user-selected time string (e.g., "9:00 AM") and combine with date
 * Returns ISO string in the specified timezone
 */
export function parseUserTimeSelection(
  date: Date,
  timeStr: string,
  timezone: string
): { start: string; end: string; hours: number; minutes: number } | null {
  // Normalize first to handle both formats
  const normalizedTime = normalizeTimeFormat(timeStr);
  const timeMatch = normalizedTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  
  if (!timeMatch) {
    console.error('[timezoneUtils] Invalid time format:', timeStr);
    console.error('[timezoneUtils] Expected format: "H:MM AM/PM", got:', typeof timeStr, timeStr);
    console.error('[timezoneUtils] Detected format:', detectTimeFormat(timeStr));
    return null;
  }

  let hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);
  const period = timeMatch[3].toUpperCase();
  
  // Convert 12-hour to 24-hour format
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  return { start: '', end: '', hours, minutes };
}

/**
 * Create booking time with proper timezone handling
 */
export function createBookingTime(
  date: Date,
  hours: number,
  minutes: number,
  durationMinutes: number,
  timezone: string
): { scheduledStart: string; scheduledEnd: string } {
  // Create time in user's timezone
  const zonedDate = toZonedTime(date, timezone);
  zonedDate.setHours(hours, minutes, 0, 0);
  
  const startTime = zonedDate;
  const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
  
  return {
    scheduledStart: startTime.toISOString(),
    scheduledEnd: endTime.toISOString(),
  };
}
