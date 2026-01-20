import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { waitFor } from '@testing-library/dom';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
vi.mock('@/services/sessionTracking', () => ({
  trackLogin: vi.fn().mockResolvedValue(undefined),
  trackLogout: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/hooks/useSecurityTracking', () => ({
  useSecurityTracking: () => ({
    recordLoginAttempt: vi.fn().mockResolvedValue(undefined),
    createSession: vi.fn().mockResolvedValue(undefined),
    endSession: vi.fn().mockResolvedValue(undefined),
  }),
  generateDeviceFingerprint: () => 'test-fingerprint-123',
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Test component to access context
const TestConsumer = () => {
  const { user, session, loading, authError, signOut } = useAuth();
  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="user">{user?.id || 'null'}</div>
      <div data-testid="session">{session ? 'has-session' : 'no-session'}</div>
      <div data-testid="error">{authError || 'no-error'}</div>
      <button data-testid="signout" onClick={signOut}>Sign Out</button>
    </div>
  );
};

const renderWithProvider = () => {
  const result = render(
    <MemoryRouter>
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    </MemoryRouter>
  );
  
  const getByTestId = (id: string) => result.container.querySelector(`[data-testid="${id}"]`);
  const queryByTestId = (id: string) => result.container.querySelector(`[data-testid="${id}"]`);
  
  return { ...result, getByTestId, queryByTestId };
};

describe('AuthContext', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    created_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {},
  };

  const mockSession = {
    access_token: 'access-token-123456789012345678901234567890',
    refresh_token: 'refresh-token',
    expires_in: 3600,
    expires_at: Date.now() / 1000 + 3600,
    token_type: 'bearer',
    user: mockUser,
  };

  let authStateCallback: ((event: string, session: any) => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    authStateCallback = null;

    // Default mock: no session
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    // Capture auth state change callback
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
      authStateCallback = callback;
      return {
        data: {
          subscription: {
            id: 'sub-123',
            callback,
            unsubscribe: vi.fn(),
          },
        },
      };
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial State', () => {
    it('should start with loading=true', async () => {
      // Don't resolve getSession immediately
      vi.mocked(supabase.auth.getSession).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { getByTestId } = renderWithProvider();
      expect(getByTestId('loading')?.textContent).toBe('true');
    });

    it('should set loading=false after getSession resolves', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { getByTestId } = renderWithProvider();
      
      await waitFor(() => {
        expect(getByTestId('loading')?.textContent).toBe('false');
      });
    });

    it('should timeout and set loading=false after 3 seconds', async () => {
      vi.useFakeTimers();
      
      // Never resolving promise
      vi.mocked(supabase.auth.getSession).mockImplementation(
        () => new Promise(() => {})
      );

      const { getByTestId } = renderWithProvider();
      expect(getByTestId('loading')?.textContent).toBe('true');

      // Advance past timeout
      await act(async () => {
        vi.advanceTimersByTime(3100);
      });

      expect(getByTestId('loading')?.textContent).toBe('false');
    });
  });

  describe('Session Management', () => {
    it('should populate user and session when getSession returns valid session', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession as any },
        error: null,
      });

      const { getByTestId } = renderWithProvider();

      await waitFor(() => {
        expect(getByTestId('loading')?.textContent).toBe('false');
        expect(getByTestId('user')?.textContent).toBe('user-123');
        expect(getByTestId('session')?.textContent).toBe('has-session');
      });
    });

    it('should handle getSession error gracefully', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: { message: 'Session error', name: 'AuthError', status: 401, code: 'auth_error', __isAuthError: true } as any,
      });

      const { getByTestId } = renderWithProvider();

      await waitFor(() => {
        expect(getByTestId('loading')?.textContent).toBe('false');
        expect(getByTestId('error')?.textContent).toBe('Session error');
      });
    });

    it('should handle getSession promise rejection', async () => {
      vi.mocked(supabase.auth.getSession).mockRejectedValue(new Error('Network error'));

      const { getByTestId } = renderWithProvider();

      await waitFor(() => {
        expect(getByTestId('loading')?.textContent).toBe('false');
        expect(getByTestId('error')?.textContent).toBe('Network error');
      });
    });
  });

  describe('Auth State Changes', () => {
    it('should update state on SIGNED_IN event', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { getByTestId } = renderWithProvider();

      await waitFor(() => {
        expect(getByTestId('loading')?.textContent).toBe('false');
      });

      // Simulate sign in event
      await act(async () => {
        authStateCallback?.('SIGNED_IN', mockSession);
      });

      expect(getByTestId('user')?.textContent).toBe('user-123');
      expect(getByTestId('session')?.textContent).toBe('has-session');
    });

    it('should clear state on SIGNED_OUT event', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession as any },
        error: null,
      });

      const { getByTestId } = renderWithProvider();

      await waitFor(() => {
        expect(getByTestId('user')?.textContent).toBe('user-123');
      });

      // Simulate sign out event
      await act(async () => {
        authStateCallback?.('SIGNED_OUT', null);
      });

      expect(getByTestId('user')?.textContent).toBe('null');
      expect(getByTestId('session')?.textContent).toBe('no-session');
    });
  });

  describe('signOut', () => {
    it('should call supabase signOut and navigate to /auth', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession as any },
        error: null,
      });
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

      const { getByTestId } = renderWithProvider();

      await waitFor(() => {
        expect(getByTestId('user')?.textContent).toBe('user-123');
      });

      await act(async () => {
        (getByTestId('signout') as HTMLButtonElement)?.click();
      });

      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/auth');
    });

    it('should clear local state even if backend signOut fails', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession as any },
        error: null,
      });
      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: { message: 'Network error', name: 'AuthError', status: 500, code: 'network_error', __isAuthError: true } as any,
      });

      const { getByTestId } = renderWithProvider();

      await waitFor(() => {
        expect(getByTestId('user')?.textContent).toBe('user-123');
      });

      await act(async () => {
        (getByTestId('signout') as HTMLButtonElement)?.click();
      });

      // Should still navigate despite error
      expect(mockNavigate).toHaveBeenCalledWith('/auth');
    });
  });

  describe('useAuth Hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      const TestOutsideProvider = () => {
        useAuth();
        return null;
      };

      expect(() => {
        render(<TestOutsideProvider />);
      }).toThrow('useAuth must be used within an AuthProvider');
    });
  });
});
