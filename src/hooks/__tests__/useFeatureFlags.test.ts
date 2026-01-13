import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFeatureFlags } from '../useFeatureFlags';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/lib/notify', () => ({
  useToast: () => ({ toast: vi.fn() }),
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

describe('useFeatureFlags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any);
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useFeatureFlags());
    expect(result.current.isLoading).toBe(true);
  });

  it('should provide toggleFlag function', () => {
    const { result } = renderHook(() => useFeatureFlags());
    expect(result.current.toggleFlag).toBeInstanceOf(Function);
  });

  it('should provide updateFlag function', () => {
    const { result } = renderHook(() => useFeatureFlags());
    expect(result.current.updateFlag).toBeInstanceOf(Function);
  });
});
