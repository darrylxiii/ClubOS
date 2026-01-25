import { supabase } from '@/integrations/supabase/client';
import { getBackendConfig, isPlaceholderEnvironment, nativeFetch } from '@/config/backend';
import { logger } from '@/lib/logger';

export interface CreateBookingRequest {
  bookingLinkSlug: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  timezone: string;
  notes?: string | null;
  guests?: Array<{ 
    name?: string; 
    email: string;
    can_cancel?: boolean;
    can_reschedule?: boolean;
    can_propose_times?: boolean;
    can_add_attendees?: boolean;
  }>;
  guestSelectedPlatform?: string;
  smsReminders?: boolean;
  delegatedPermissions?: {
    can_cancel: boolean;
    can_reschedule: boolean;
    can_propose_times: boolean;
    can_add_attendees: boolean;
  };
}

export interface CreateBookingResponse {
  success: boolean;
  booking: {
    id: string;
    [key: string]: unknown;
  };
}

interface CreateBookingOptions {
  recaptchaToken?: string;
}

function isNetworkError(err: unknown): boolean {
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
        controller.signal.addEventListener('abort', () => reject(new Error('Request timeout'))),
      ),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

async function invokeCreateBooking(
  body: CreateBookingRequest,
  options: CreateBookingOptions = {}
): Promise<CreateBookingResponse> {
  const headers: Record<string, string> = {};
  if (options.recaptchaToken) {
    headers['x-recaptcha-token'] = options.recaptchaToken;
  }

  const { data, error } = await supabase.functions.invoke('create-booking', {
    headers,
    body,
  });

  if (error) {
    throw error;
  }

  if (!data || typeof data !== 'object' || !('booking' in data)) {
    throw new Error('Invalid response from booking service');
  }

  return data as CreateBookingResponse;
}

async function fetchCreateBookingDirect(
  body: CreateBookingRequest,
  options: CreateBookingOptions = {}
): Promise<CreateBookingResponse> {
  const { baseUrl, publishableKey } = getBackendConfig();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: publishableKey,
    Authorization: `Bearer ${publishableKey}`,
  };

  if (options.recaptchaToken) {
    headers['x-recaptcha-token'] = options.recaptchaToken;
  }

  // Use nativeFetch to bypass any instrumentation (OTel, etc.)
  const res = await nativeFetch(`${baseUrl}/functions/v1/create-booking`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const responseText = await res.text();
  
  let json: unknown;
  try {
    json = JSON.parse(responseText);
  } catch {
    throw new Error(`Invalid response: ${responseText.substring(0, 100)}`);
  }

  if (!res.ok) {
    const errorBody = json as { error?: string; message?: string };
    throw new Error(errorBody.error || errorBody.message || `HTTP ${res.status}`);
  }

  const data = json as CreateBookingResponse;
  
  if (!data || typeof data !== 'object' || !('booking' in data)) {
    throw new Error('Invalid response from booking service');
  }

  return data;
}

/**
 * Creates a booking using the edge function.
 *
 * Auto-detect strategy:
 * - If environment is placeholder/preview, skip invoke and use direct fetch only
 * - Otherwise: Primary supabase.functions.invoke, fallback to direct fetch
 */
export async function createBooking(
  request: CreateBookingRequest,
  options: CreateBookingOptions = {}
): Promise<CreateBookingResponse> {
  const isPlaceholder = isPlaceholderEnvironment();

  try {
    if (isPlaceholder) {
      // Skip invoke entirely in placeholder environments - go straight to direct fetch
      logger.debug('Using direct fetch for booking (placeholder environment)', {
        componentName: 'booking-service',
      });
      return await withTimeout(fetchCreateBookingDirect(request, options), 15000);
    }

    // Normal path: try invoke first
    return await withTimeout(invokeCreateBooking(request, options), 15000);
  } catch (err: unknown) {
    // If not placeholder and it's a network error, try direct fetch as fallback
    if (!isPlaceholder && isNetworkError(err)) {
      logger.warn('Supabase invoke failed, falling back to direct fetch', {
        componentName: 'booking-service',
        error: err,
      });
      
      try {
        return await withTimeout(fetchCreateBookingDirect(request, options), 15000);
      } catch (fallbackErr: unknown) {
        throw fallbackErr;
      }
    }

    throw err;
  }
}
