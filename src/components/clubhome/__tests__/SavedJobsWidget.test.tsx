import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { SavedJobsWidget } from '../SavedJobsWidget';

// Mock auth context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'test-user-id' },
    loading: false,
  })),
}));

// Mock supabase with saved jobs data
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'saved-1',
            job_id: 'job-1',
            created_at: new Date().toISOString(),
            job: {
              id: 'job-1',
              title: 'Senior Developer',
              location: 'Amsterdam',
              employment_type: 'full-time',
              company: {
                name: 'Tech Corp',
                logo_url: null,
              },
            },
          },
        ],
        error: null,
      }),
      delete: vi.fn().mockReturnThis(),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
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

describe('SavedJobsWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the widget title', async () => {
    render(<SavedJobsWidget />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Saved Jobs')).toBeInTheDocument();
  });

  it('displays loading skeletons initially', () => {
    render(<SavedJobsWidget />, { wrapper: createWrapper() });
    
    // Check for loading state
    expect(screen.getByRole('status', { name: /loading saved jobs/i })).toBeInTheDocument();
  });

  it('has accessible structure with proper ARIA attributes', async () => {
    render(<SavedJobsWidget />, { wrapper: createWrapper() });
    
    // Widget should have proper title
    expect(screen.getByText('Saved Jobs')).toBeInTheDocument();
    
    // View All button should have accessible label
    const viewAllButton = await screen.findByRole('button', { name: /view all saved jobs/i });
    expect(viewAllButton).toBeInTheDocument();
  });
});
