import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useProfile } from '../useProfile';
import { supabase } from '@/integrations/supabase/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const wrapper = ({ children }: { children: ReactNode }) => 
  React.createElement(QueryClientProvider, { client: queryClient }, children);

describe('useProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('should fetch profile data', async () => {
    const mockProfile = {
      id: '123',
      full_name: 'Test User',
      email: 'test@example.com',
    };

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: '123' } as any },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
    } as any);

    const { result } = renderHook(() => useProfile(), { wrapper });

    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(result.current.profile).toBeDefined();
  });

  it('should handle profile fetch error', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: '123' } as any },
      error: null,
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ 
        data: null, 
        error: new Error('Profile not found') 
      }),
    } as any);

    const { result } = renderHook(() => useProfile(), { wrapper });

    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(result.current.loading).toBe(false);
  });
});
