import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { NextBestActionCard } from '../NextBestActionCard';

// Mock auth context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'test-user-id' },
    loading: false,
  })),
}));

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          full_name: 'Test User',
          current_title: 'Developer',
          bio: 'A test bio that is long enough',
          avatar_url: 'https://example.com/avatar.jpg',
        },
        error: null,
      }),
    })),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('NextBestActionCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(<NextBestActionCard />, { wrapper: createWrapper() });
    
    // Should show skeleton during loading
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('displays QUIN branding', async () => {
    render(<NextBestActionCard />, { wrapper: createWrapper() });
    
    // After loading, should show QUIN branding
    const quinText = await screen.findByText(/powered by quin/i);
    expect(quinText).toBeInTheDocument();
  });
});
