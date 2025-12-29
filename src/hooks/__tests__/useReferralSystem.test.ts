import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useReferralPolicies, useReferralEarnings, useReferralStats } from '../useReferralSystem';
import { supabase } from '@/integrations/supabase/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user-id', email: 'test@example.com' } }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useReferralPolicies', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should fetch referral policies', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any);

    const { result } = renderHook(() => useReferralPolicies(), { wrapper: createWrapper() });
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(result.current.data).toBeDefined();
  });
});

describe('useReferralEarnings', () => {
  it('should fetch referral earnings', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any);

    const { result } = renderHook(() => useReferralEarnings(), { wrapper: createWrapper() });
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(result.current.data).toBeDefined();
  });
});

describe('useReferralStats', () => {
  it('should calculate referral statistics', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any);

    const { result } = renderHook(() => useReferralStats(), { wrapper: createWrapper() });
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(result.current.data).toBeDefined();
  });
});
