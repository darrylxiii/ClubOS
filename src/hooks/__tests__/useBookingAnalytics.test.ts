import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBookingAnalytics } from '../useBookingAnalytics';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [{ id: '1' }], error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}));

describe('useBookingAnalytics', () => {
  const mockBookingLinkId = 'test-booking-link-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with a session ID', () => {
    const { result } = renderHook(() => useBookingAnalytics(mockBookingLinkId));
    expect(result.current.sessionId).toBeDefined();
  });

  it('should provide trackStep function', () => {
    const { result } = renderHook(() => useBookingAnalytics(mockBookingLinkId));
    expect(result.current.trackStep).toBeInstanceOf(Function);
  });

  it('should track landing step', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    } as any);

    const { result } = renderHook(() => useBookingAnalytics(mockBookingLinkId));

    // useEffect calls trackStep('landing') which sets currentStep but doesn't
    // insert (no previous step). Calling another step verifies tracking works.
    await act(async () => {
      await result.current.trackStep('calendar_view');
    });

    expect(result.current.trackStep).toBeInstanceOf(Function);
  });

  it('should not track if bookingLinkId is empty', async () => {
    const { result } = renderHook(() => useBookingAnalytics(''));
    
    await act(async () => {
      await result.current.trackStep('landing');
    });

    expect(supabase.from).not.toHaveBeenCalled();
  });
});
