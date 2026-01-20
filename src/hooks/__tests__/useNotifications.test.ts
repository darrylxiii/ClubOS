import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNotifications } from '../useNotifications';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user-id', email: 'test@example.com' } }),
}));

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useNotifications());
    expect(result.current.loading).toBe(true);
  });

  it('should provide markAsRead function', () => {
    const { result } = renderHook(() => useNotifications());
    expect(result.current.markAsRead).toBeInstanceOf(Function);
  });

  it('should provide markAllAsRead function', () => {
    const { result } = renderHook(() => useNotifications());
    expect(result.current.markAllAsRead).toBeInstanceOf(Function);
  });
});
