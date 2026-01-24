/**
 * Centralized timezone handling for The Quantum Club booking system
 * Uses native Intl.DateTimeFormat APIs for maximum reliability
 */

import { format } from 'date-fns';
import { logger } from '@/lib/logger';
import { safeFormatTime, formatTimeRange } from '@/lib/safeTimeFormat';

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
 * Format a date to ISO-like string for a specific timezone using native APIs
 * Use this when sending dates to edge functions
 */
export function formatDateForTimezone(date: Date, timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const get = (type: string) => parts.find(p => p.type === type)?.value || '';
    return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;
  } catch {
    return date.toISOString();
  }
}

/**
 * Format a date range for slot queries
 * Ensures start/end are properly bounded in the target timezone
 */
export function getDateRangeForTimezone(date: Date, timezone: string) {
  try {
    // Format date as YYYY-MM-DD in target timezone
    const dateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
    
    return {
      start: dateStr,
      end: dateStr,
    };
  } catch {
    const fallback = date.toISOString().split('T')[0];
    return { start: fallback, end: fallback };
  }
}

/**
 * Format time slot for display in user's timezone
 * Uses robust native formatting from safeTimeFormat
 */
export function formatTimeSlot(isoStart: string, isoEnd: string, timezone: string): string {
  return formatTimeRange(isoStart, isoEnd, timezone, '12h');
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
  const fmt = detectTimeFormat(timeStr);
  
  // Already in correct format
  if (fmt === 'am-pm') {
    return timeStr;
  }
  
  // Convert 24-hour to 12-hour format
  if (fmt === '24-hour') {
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
 * Returns parsed time components
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
 * Uses native APIs for timezone conversion
 */
export function createBookingTime(
  date: Date,
  hours: number,
  minutes: number,
  durationMinutes: number,
  timezone: string
): { scheduledStart: string; scheduledEnd: string } {
  // Create time in user's timezone using native conversion
  const zonedDate = toTimezone(date, timezone);
  zonedDate.setHours(hours, minutes, 0, 0);
  
  const startTime = zonedDate;
  const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
  
  return {
    scheduledStart: startTime.toISOString(),
    scheduledEnd: endTime.toISOString(),
  };
}

/**
 * Convert a date to a specific timezone using native APIs
 * Returns a Date object representing the time in that timezone
 */
export function toTimezone(date: Date, timezone: string): Date {
  try {
    // Get the time string in the target timezone
    const tzString = date.toLocaleString('en-US', { timeZone: timezone });
    return new Date(tzString);
  } catch {
    return date;
  }
}

/**
 * Format time for display using native APIs
 * Re-export from safeTimeFormat for convenience
 */
export { safeFormatTime, formatTimeRange } from '@/lib/safeTimeFormat';
