import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMessages } from '../useMessages';

vi.mock('@/integrations/supabase/client', () => {
  const channelMock = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  };
  return {
    supabase: {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      channel: vi.fn().mockReturnValue(channelMock),
      removeChannel: vi.fn(),
    },
  };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user-id', email: 'test@example.com' } }),
}));

describe('useMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useMessages());
    expect(result.current.loading).toBe(true);
  });

  it('should provide sendMessage function', () => {
    const { result } = renderHook(() => useMessages('conv-1'));
    expect(result.current.sendMessage).toBeInstanceOf(Function);
  });

  it('should track typing users state', () => {
    const { result } = renderHook(() => useMessages('conv-1'));
    expect(result.current.typingUsers).toEqual([]);
  });
});
