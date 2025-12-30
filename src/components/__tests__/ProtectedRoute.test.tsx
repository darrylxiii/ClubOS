import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';
import { supabase } from '@/integrations/supabase/client';

// Mock AuthContext
const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const renderWithRouter = (initialRoute = '/protected') => {
  const result = render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/auth" element={<div data-testid="auth-page">Auth Page</div>} />
        <Route path="/oauth-onboarding" element={<div data-testid="onboarding-page">Onboarding</div>} />
        <Route path="/pending-approval" element={<div data-testid="pending-page">Pending Approval</div>} />
        <Route path="/protected" element={
          <ProtectedRoute>
            <div data-testid="protected-content">Protected Content</div>
          </ProtectedRoute>
        } />
      </Routes>
    </MemoryRouter>
  );
  
  const getByTestId = (id: string) => result.container.querySelector(`[data-testid="${id}"]`);
  const queryByTestId = (id: string) => result.container.querySelector(`[data-testid="${id}"]`);
  
  return { ...result, getByTestId, queryByTestId };
};

// Helper to create mock supabase.from implementation
const createMockFrom = (profileData: any, userRolesData: any) => {
  return vi.fn().mockImplementation(() => ({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockImplementation(() => ({
        single: vi.fn().mockResolvedValue(profileData),
      })),
    }),
  })) as any;
};

describe('ProtectedRoute', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default: authenticated user with approved status
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
    });

    // Default mock for supabase.from - returns approved profile
    vi.mocked(supabase.from as any).mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockImplementation(() => ({
          single: vi.fn().mockResolvedValue({
            data: { account_status: 'approved', onboarding_completed_at: new Date().toISOString() },
            error: null,
          }),
        })),
      }),
    }));
  });

  describe('Loading State', () => {
    it('should show loading indicator when auth is loading', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
      });

      const { queryByTestId } = renderWithRouter();
      
      // PageLoader should be present (contains loading animation)
      expect(queryByTestId('protected-content')).toBeNull();
    });
  });

  describe('Unauthenticated Users', () => {
    it('should redirect to /auth when no user and loading is complete', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
      });

      const { getByTestId } = renderWithRouter();

      await waitFor(() => {
        expect(getByTestId('auth-page')).toBeTruthy();
      });
    });
  });

  describe('Account Status - Approved', () => {
    it('should render protected content when user is approved', async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
      });

      vi.mocked(supabase.from as any).mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation(() => ({
            single: vi.fn().mockResolvedValue({
              data: { account_status: 'approved', onboarding_completed_at: new Date().toISOString() },
              error: null,
            }),
          })),
        }),
      }));

      const { getByTestId } = renderWithRouter();

      await waitFor(() => {
        expect(getByTestId('protected-content')).toBeTruthy();
      });
    });
  });

  describe('Test Account Bypass', () => {
    it('should skip onboarding for test accounts', async () => {
      mockUseAuth.mockReturnValue({
        user: { ...mockUser, email: 'test@example.com' },
        loading: false,
      });

      vi.mocked(supabase.from as any).mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation(() => ({
            single: vi.fn().mockResolvedValue({
              data: { account_status: 'approved', onboarding_completed_at: null },
              error: null,
            }),
          })),
        }),
      }));

      const { getByTestId } = renderWithRouter();

      await waitFor(() => {
        expect(getByTestId('protected-content')).toBeTruthy();
      });
    });
  });
});
