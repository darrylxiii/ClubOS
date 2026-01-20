import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMessages } from '../useMessages';
import { supabase } from '@/integrations/supabase/client';

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
