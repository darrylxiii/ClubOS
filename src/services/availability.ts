import { supabase } from '@/integrations/supabase/client';
import { getBackendConfig, isPlaceholderEnvironment, nativeFetch } from '@/config/backend';

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

async function invokeGetAvailableSlots(body: AvailabilityRequest): Promise<AvailabilityResponse> {
  const { data, error } = await supabase.functions.invoke('get-available-slots', { body });
  if (error) throw new Error(error.message || 'availability_invoke_error');
  if (!data || typeof data !== 'object' || !('slots' in data)) {
    throw new Error('availability_invalid_response');
  }
  return data as AvailabilityResponse;
}

function resolveBackendConfig(): { baseUrl: string; publishableKey: string } {
  return getBackendConfig();
}

async function fetchGetAvailableSlotsDirect(body: AvailabilityRequest): Promise<AvailabilityResponse> {
  const { baseUrl, publishableKey } = resolveBackendConfig();

  // Use nativeFetch to bypass any instrumentation (OTel, etc.)
  const res = await nativeFetch(`${baseUrl}/functions/v1/get-available-slots`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
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
 * Auto-detect strategy:
 * - If environment is placeholder/preview, skip invoke and use direct fetch only
 * - Otherwise: Primary supabase.functions.invoke, fallback to direct fetch
 *
 * Includes a short timeout + retry to avoid transient edge/network hiccups.
 */
export async function getAvailableSlots(request: AvailabilityRequest): Promise<AvailabilityResponse> {
  const isPlaceholder = isPlaceholderEnvironment();
  const attempts = [500, 1500];
  let lastError: unknown;

  for (let i = 0; i < attempts.length + 1; i++) {
    try {
      if (isPlaceholder) {
        // Skip invoke entirely in placeholder environments - go straight to direct fetch
        const result = await withTimeout(fetchGetAvailableSlotsDirect(request), 8000);
        return result;
      }

      // Normal path: try invoke first
      const result = await withTimeout(invokeGetAvailableSlots(request), 5000);
      return result;
    } catch (err: unknown) {
      lastError = err;

      // If not placeholder and it's a network error, try direct fetch as fallback
      if (!isPlaceholder && isNetworkishError(err)) {
        try {
          const result = await withTimeout(fetchGetAvailableSlotsDirect(request), 8000);
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
