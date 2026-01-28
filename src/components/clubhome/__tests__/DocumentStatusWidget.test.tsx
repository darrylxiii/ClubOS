import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { DocumentStatusWidget } from '../DocumentStatusWidget';

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
    from: vi.fn((table) => {
      if (table === 'candidate_profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              resume_url: 'https://example.com/resume.pdf',
              resume_filename: 'resume.pdf',
              updated_at: new Date().toISOString(),
            },
            error: null,
          }),
        };
      }
      if (table === 'candidate_documents') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              {
                document_type: 'cover_letter',
                file_url: 'https://example.com/cover.pdf',
                file_name: 'cover_letter.pdf',
                uploaded_at: new Date().toISOString(),
              },
            ],
            error: null,
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
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

describe('DocumentStatusWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the widget title', async () => {
    render(<DocumentStatusWidget />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Documents')).toBeInTheDocument();
  });

  it('displays loading skeletons initially', () => {
    render(<DocumentStatusWidget />, { wrapper: createWrapper() });
    
    expect(screen.getByRole('status', { name: /loading document status/i })).toBeInTheDocument();
  });

  it('has proper accessibility structure', async () => {
    render(<DocumentStatusWidget />, { wrapper: createWrapper() });
    
    // Manage button should have accessible label
    const manageButton = await screen.findByRole('button', { name: /manage your documents/i });
    expect(manageButton).toBeInTheDocument();
  });
});
