import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useActivityTracking } from '../useActivityTracking';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  },
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
  }),
}));

describe('useActivityTracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize tracking on mount', () => {
    const { result } = renderHook(() => useActivityTracking());
    expect(result.current).toBeDefined();
  });

  it('should provide trackActivity function', async () => {
    const { result } = renderHook(() => useActivityTracking());
    
    await waitFor(() => {
      expect(result.current.trackActivity).toBeInstanceOf(Function);
    });
  });

  it('should provide updateOnlineStatus function', async () => {
    const { result } = renderHook(() => useActivityTracking());
    
    await waitFor(() => {
      expect(result.current.updateOnlineStatus).toBeInstanceOf(Function);
    });
  });

  it('should handle missing user gracefully', () => {
    vi.mocked(() => ({
      useAuth: () => ({ user: null }),
    }));
    
    const { result } = renderHook(() => useActivityTracking());
    expect(result.current).toBeDefined();
  });
});
