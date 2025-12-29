import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCRMDeals } from '../useCRMDeals';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe('useCRMDeals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useCRMDeals());
    expect(result.current.loading).toBe(true);
  });

  it('should provide refetch function', () => {
    const { result } = renderHook(() => useCRMDeals());
    expect(result.current.refetch).toBeInstanceOf(Function);
  });

  it('should fetch deals successfully', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any);

    const { result } = renderHook(() => useCRMDeals());
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(result.current.deals).toBeDefined();
  });
});
