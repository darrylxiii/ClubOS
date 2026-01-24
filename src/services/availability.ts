import { supabase } from '@/integrations/supabase/client';

type ISODate = string;

export interface AvailabilityRequest {
  bookingLinkSlug: string;
  dateRange: {
    start: ISODate;
    end: ISODate;
  };
  timezone: string;
}

export interface AvailabilityResponse {
  slots: unknown[];
}

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
    m.includes('cors')
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

async function invokeGetAvailableSlots(body: AvailabilityRequest): Promise<AvailabilityResponse> {
  const { data, error } = await supabase.functions.invoke('get-available-slots', { body });
  if (error) throw new Error(error.message || 'availability_invoke_error');
  if (!data || typeof data !== 'object' || !('slots' in data)) {
    throw new Error('availability_invalid_response');
  }
  return data as AvailabilityResponse;
}

async function fetchGetAvailableSlotsDirect(body: AvailabilityRequest): Promise<AvailabilityResponse> {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

  if (!baseUrl || !publishableKey) {
    throw new Error('availability_missing_backend_env');
  }

  const res = await fetch(`${baseUrl}/functions/v1/get-available-slots`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: publishableKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`availability_http_${res.status}${text ? `: ${text}` : ''}`);
  }

  const json = (await res.json()) as AvailabilityResponse;
  return json;
}

/**
 * Fetches availability for public booking pages.
 *
 * Primary: supabase.functions.invoke
 * Fallback: direct fetch to /functions/v1/get-available-slots
 *
 * Includes a short timeout + retry to avoid transient edge/network hiccups.
 */
export async function getAvailableSlots(request: AvailabilityRequest): Promise<AvailabilityResponse> {
  const attempts = [250, 750];
  let lastError: unknown;

  for (let i = 0; i < attempts.length + 1; i++) {
    try {
      const result = await withTimeout(invokeGetAvailableSlots(request), 5000);
      return result;
    } catch (err: unknown) {
      lastError = err;

      // Only fallback on "couldn't reach backend" class errors.
      if (isNetworkishError(err)) {
        try {
          const result = await withTimeout(fetchGetAvailableSlotsDirect(request), 5000);
          return result;
        } catch (fallbackErr: unknown) {
          lastError = fallbackErr;
        }
      }

      if (i < attempts.length) {
        await sleep(attempts[i]);
        continue;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('availability_unknown_error');
}
