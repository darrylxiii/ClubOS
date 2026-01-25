import type { TimeFormat } from '@/hooks/useTimeFormatPreference';

/**
 * Manual fallback that extracts time from UTC and formats it - never returns raw ISO
 */
function manualTimeFormat(date: Date, format: TimeFormat): string {
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  if (format === '24h') {
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHour}:${minutes} ${period}`;
}

/**
 * Extract time from ISO string pattern as last resort
 */
function extractTimeFromISO(isoString: string, format: TimeFormat): string | null {
  const match = isoString.match(/T(\d{2}):(\d{2})/);
  if (match) {
    const h = parseInt(match[1], 10);
    const m = match[2];
    if (format === '24h') return `${h.toString().padStart(2, '0')}:${m}`;
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayHour}:${m} ${period}`;
  }
  return null;
}

/**
 * Safely format a time from an ISO string using native Intl.DateTimeFormat
 * This is more robust than date-fns-tz which can fail in certain environments.
 * NEVER returns raw ISO strings - always produces human-readable time.
 */
export function safeFormatTime(
  isoString: string,
  timezone: string,
  format: TimeFormat = '12h'
): string {
  // Validate timezone - fallback to UTC if invalid
  const safeTimezone = timezone || 'UTC';
  
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      console.warn('[safeFormatTime] Invalid date:', isoString);
      // Try to extract time from ISO string directly
      const extracted = extractTimeFromISO(isoString, format);
      if (extracted) return extracted;
      return 'Invalid time';
    }

    // Try native Intl.DateTimeFormat with timezone
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: format === '12h',
      timeZone: safeTimezone,
    }).format(date);
  } catch (err) {
    console.warn('[safeFormatTime] Intl.DateTimeFormat failed:', err, { isoString, timezone: safeTimezone });
    
    // Fallback 1: try without timezone (local time)
    try {
      const date = new Date(isoString);
      if (!isNaN(date.getTime())) {
        return new Intl.DateTimeFormat('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: format === '12h',
        }).format(date);
      }
    } catch {
      // Continue to manual fallback
    }
    
    // Fallback 2: manual UTC-based calculation
    try {
      const date = new Date(isoString);
      if (!isNaN(date.getTime())) {
        return manualTimeFormat(date, format);
      }
    } catch {
      // Even this failed
    }
    
    // Fallback 3: extract time from string pattern
    const extracted = extractTimeFromISO(isoString, format);
    if (extracted) return extracted;
    
    // Absolute last resort - never show raw ISO
    return 'Time unavailable';
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
