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
