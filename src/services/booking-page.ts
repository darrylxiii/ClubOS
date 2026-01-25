import { supabase } from '@/integrations/supabase/client';
import { getBackendConfig, isPlaceholderEnvironment, nativeFetch } from '@/config/backend';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isNetworkishError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  const m = message.toLowerCase();
  return (
    m.includes('failed to send a request') ||
    m.includes('failed to fetch') ||
    m.includes('network') ||
    m.includes('fetch') ||
    m.includes('cors') ||
    m.includes('timeout')
  );
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        controller.signal.addEventListener('abort', () => reject(new Error('timeout'))),
      ),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

function resolveBackendConfig(): { baseUrl: string; publishableKey: string } {
  return getBackendConfig();
}

// Cache key for sessionStorage
const CACHE_KEY_PREFIX = 'tqc_booking_page_';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CachedBookingPage {
  data: BookingPageResponse;
  timestamp: number;
}

function getCachedBookingPage(slug: string): BookingPageResponse | null {
  try {
    const cached = sessionStorage.getItem(`${CACHE_KEY_PREFIX}${slug}`);
    if (!cached) return null;
    const parsed: CachedBookingPage = JSON.parse(cached);
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) {
      sessionStorage.removeItem(`${CACHE_KEY_PREFIX}${slug}`);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function setCachedBookingPage(slug: string, data: BookingPageResponse): void {
  try {
    const cached: CachedBookingPage = { data, timestamp: Date.now() };
    sessionStorage.setItem(`${CACHE_KEY_PREFIX}${slug}`, JSON.stringify(cached));
  } catch {
    // Ignore storage errors
  }
}

export type HostDisplayMode = 'full' | 'discreet' | 'avatar_only' | 'name_only';

export interface BookingPageResponse {
  bookingLink: {
    id: string;
    user_id: string;
    slug: string;
    title: string;
    description: string | null;
    duration_minutes: number;
    buffer_before_minutes: number;
    buffer_after_minutes: number;
    advance_booking_days: number;
    min_notice_hours: number;
    color: string;
    custom_questions: unknown;
    is_active: boolean;
    allow_guest_platform_choice?: boolean;
    available_platforms?: string[];
    video_platform?: string;
    host_display_mode?: HostDisplayMode;
    guest_permissions?: {
      allow_guest_cancel?: boolean;
      allow_guest_reschedule?: boolean;
      allow_guest_propose_times?: boolean;
      allow_guest_add_attendees?: boolean;
      booker_can_delegate?: boolean;
    };
  };
  host: {
    full_name: string | null;
    avatar_url: string | null;
    work_timezone: string | null;
    display_mode?: HostDisplayMode;
  };
  hasCalendarConnected?: boolean;
  hasGoogleCalendar?: boolean;
}

async function invokeGetBookingPage(slug: string): Promise<BookingPageResponse> {
  const { data, error } = await supabase.functions.invoke('get-booking-page', {
    body: { slug },
  });

  if (error) throw new Error(error.message || 'booking_page_invoke_error');
  if (!data || typeof data !== 'object' || !('bookingLink' in data)) {
    throw new Error('booking_page_invalid_response');
  }
  return data as BookingPageResponse;
}

async function fetchGetBookingPageDirect(slug: string): Promise<BookingPageResponse> {
  const { baseUrl, publishableKey } = resolveBackendConfig();

  // Use nativeFetch to bypass any instrumentation (OTel, etc.)
  const res = await nativeFetch(`${baseUrl}/functions/v1/get-booking-page`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
    },
    body: JSON.stringify({ slug }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`booking_page_http_${res.status}${text ? `: ${text}` : ''}`);
  }

  return (await res.json()) as BookingPageResponse;
}

/**
 * Public booking page bootstrap.
 * 
 * Auto-detect strategy:
 * - If environment is placeholder/preview, skip invoke and use direct fetch only
 * - Otherwise: Primary supabase.functions.invoke, fallback to direct fetch
 * 
 * Includes caching (5 min) and retry logic for resilience.
 */
export async function getBookingPage(slug: string): Promise<BookingPageResponse> {
  // Check cache first
  const cached = getCachedBookingPage(slug);
  if (cached) {
    return cached;
  }

  const isPlaceholder = isPlaceholderEnvironment();
  const attempts = [500, 1500]; // Slightly longer delays for cold starts
  let lastError: unknown;

  for (let i = 0; i < attempts.length + 1; i++) {
    try {
      let result: BookingPageResponse;

      if (isPlaceholder) {
        // Skip invoke entirely in placeholder environments - go straight to direct fetch
        result = await withTimeout(fetchGetBookingPageDirect(slug), 8000);
      } else {
        // Normal path: try invoke first
        result = await withTimeout(invokeGetBookingPage(slug), 5000);
      }

      // Cache successful response
      setCachedBookingPage(slug, result);
      return result;
    } catch (err: unknown) {
      lastError = err;

      // If not placeholder and it's a network error, try direct fetch as fallback
      if (!isPlaceholder && isNetworkishError(err)) {
        try {
          const result = await withTimeout(fetchGetBookingPageDirect(slug), 8000);
          setCachedBookingPage(slug, result);
          return result;
        } catch (fallbackErr: unknown) {
          lastError = fallbackErr;
        }
      }

      if (i < attempts.length) {
        await sleep(attempts[i]);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('booking_page_unknown_error');
}
