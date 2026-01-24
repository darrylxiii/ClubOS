import type { TimeFormat } from '@/hooks/useTimeFormatPreference';

/**
 * Safely format a time from an ISO string using native Intl.DateTimeFormat
 * This is more robust than date-fns-tz which can fail in certain environments
 */
export function safeFormatTime(
  isoString: string,
  timezone: string,
  format: TimeFormat = '12h'
): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      return isoString;
    }

    // Use native Intl.DateTimeFormat - always available, always works
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: format === '12h',
      timeZone: timezone,
    }).format(date);
  } catch {
    // Fallback: try without timezone (local time)
    try {
      return new Date(isoString).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: format === '12h',
      });
    } catch {
      // Ultimate fallback: return raw string
      return isoString;
    }
  }
}

/**
 * Format a time slot range (start - end) with proper formatting
 */
export function formatTimeRange(
  startIso: string,
  endIso: string,
  timezone: string,
  format: TimeFormat = '12h'
): string {
  const start = safeFormatTime(startIso, timezone, format);
  const end = safeFormatTime(endIso, timezone, format);
  return `${start} – ${end}`;
}

/**
 * Format a slot with optional secondary timezone display
 */
export function formatSlotWithDualTimezone(
  startIso: string,
  endIso: string,
  guestTimezone: string,
  hostTimezone: string | null | undefined,
  format: TimeFormat = '12h'
): { primary: string; secondary: string | null } {
  const primary = formatTimeRange(startIso, endIso, guestTimezone, format);

  // Show host timezone if different from guest
  if (hostTimezone && hostTimezone !== guestTimezone) {
    const secondary = formatTimeRange(startIso, endIso, hostTimezone, format);
    return { primary, secondary: `${secondary} (host)` };
  }

  return { primary, secondary: null };
}

/**
 * Format a date to ISO-like string in a specific timezone using native APIs
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
 * Get start and end of day boundaries for a date in a timezone
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
 * Format a Date object for display as time only (e.g., "9:00 AM" or "09:00")
 */
export function formatTimeFromDate(
  date: Date,
  timezone: string,
  format: TimeFormat = '12h'
): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: format === '12h',
      timeZone: timezone,
    }).format(date);
  } catch {
    // Fallback without timezone
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    if (format === '24h') {
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHour}:${minutes} ${period}`;
  }
}
