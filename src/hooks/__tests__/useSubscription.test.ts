import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSubscription } from '../useSubscription';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'test-token' } }, error: null }),
    },
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user-id', email: 'test@example.com' } }),
}));

describe('useSubscription', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useSubscription());
    expect(result.current.loading).toBe(true);
  });

  it('should provide refetch function', () => {
    const { result } = renderHook(() => useSubscription());
    expect(result.current.refetch).toBeInstanceOf(Function);
  });
});
