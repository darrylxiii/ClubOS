import { supabase } from '@/integrations/supabase/client';
import { getBackendConfig } from '@/config/backend';

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
    // If promise doesn't support AbortController, we still get a hard timeout via race.
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
  // Use a single central resolver to avoid relying on a placeholder client in preview.
  return getBackendConfig();
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

  const res = await fetch(`${baseUrl}/functions/v1/get-booking-page`, {
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
 * Primary: supabase.functions.invoke
 * Fallback: direct fetch to /functions/v1/get-booking-page
 */
export async function getBookingPage(slug: string): Promise<BookingPageResponse> {
  const attempts = [250, 750];
  let lastError: unknown;

  for (let i = 0; i < attempts.length + 1; i++) {
    try {
      return await withTimeout(invokeGetBookingPage(slug), 5000);
    } catch (err: unknown) {
      lastError = err;

      if (isNetworkishError(err)) {
        try {
          return await withTimeout(fetchGetBookingPageDirect(slug), 5000);
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
