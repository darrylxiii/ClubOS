import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLoginLockout } from '../useLoginLockout';

interface LockoutStatus {
  locked: boolean;
  attempts: number;
  remainingSeconds?: number;
  unlockAt?: string;
  message?: string;
}

// ---- Supabase mock ----
const { mockInvoke } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    functions: {
      invoke: mockInvoke,
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
    })),
  },
}));

describe('useLoginLockout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  // ---------------------------------------------------------------------------
  // Initial state
  // ---------------------------------------------------------------------------
  describe('initial state', () => {
    it('should start with null lockoutStatus and isChecking=false', () => {
      const { result } = renderHook(() => useLoginLockout());

      expect(result.current.lockoutStatus).toBeNull();
      expect(result.current.isChecking).toBe(false);
    });

    it('should expose checkLockout and recordAttempt functions', () => {
      const { result } = renderHook(() => useLoginLockout());

      expect(typeof result.current.checkLockout).toBe('function');
      expect(typeof result.current.recordAttempt).toBe('function');
    });
  });

  // ---------------------------------------------------------------------------
  // checkLockout
  // ---------------------------------------------------------------------------
  describe('checkLockout', () => {
    it('should return unlocked status when server says not locked', async () => {
      mockInvoke.mockResolvedValue({
        data: { locked: false, attempts: 2 },
        error: null,
      });

      const { result } = renderHook(() => useLoginLockout());

      let status: LockoutStatus;
      await act(async () => {
        status = await result.current.checkLockout('user@example.com');
      });

      expect(status.locked).toBe(false);
      expect(status.attempts).toBe(2);
      expect(result.current.lockoutStatus?.locked).toBe(false);
    });

    it('should return locked status after N failed attempts', async () => {
      mockInvoke.mockResolvedValue({
        data: {
          locked: true,
          attempts: 5,
          remaining_seconds: 300,
          unlock_at: '2026-03-27T12:05:00Z',
          message: 'Account locked for 5 minutes after 5 failed attempts',
        },
        error: null,
      });

      const { result } = renderHook(() => useLoginLockout());

      let status: LockoutStatus;
      await act(async () => {
        status = await result.current.checkLockout('user@example.com');
      });

      expect(status.locked).toBe(true);
      expect(status.attempts).toBe(5);
      expect(status.remainingSeconds).toBe(300);
      expect(status.unlockAt).toBe('2026-03-27T12:05:00Z');
      expect(status.message).toContain('5 failed attempts');
    });

    it('should expose lockout message content for UI display', async () => {
      mockInvoke.mockResolvedValue({
        data: {
          locked: true,
          attempts: 5,
          remaining_seconds: 120,
          message: 'Too many login attempts. Try again in 2 minutes.',
        },
        error: null,
      });

      const { result } = renderHook(() => useLoginLockout());

      await act(async () => {
        await result.current.checkLockout('user@example.com');
      });

      expect(result.current.lockoutStatus?.message).toBe(
        'Too many login attempts. Try again in 2 minutes.'
      );
    });

    it('should call the edge function with correct parameters', async () => {
      mockInvoke.mockResolvedValue({
        data: { locked: false, attempts: 0 },
        error: null,
      });

      const { result } = renderHook(() => useLoginLockout());

      await act(async () => {
        await result.current.checkLockout('test@example.com');
      });

      expect(mockInvoke).toHaveBeenCalledWith('check-login-lockout', {
        body: { email: 'test@example.com', action: 'check' },
      });
    });

    it('should fail open (allow login) when the edge function returns an error', async () => {
      mockInvoke.mockResolvedValue({
        data: null,
        error: new Error('Edge function timeout'),
      });

      const { result } = renderHook(() => useLoginLockout());

      let status: LockoutStatus;
      await act(async () => {
        status = await result.current.checkLockout('user@example.com');
      });

      // Should fail open: not locked, 0 attempts
      expect(status.locked).toBe(false);
      expect(status.attempts).toBe(0);
    });

    it('should fail open when the edge function throws an exception', async () => {
      mockInvoke.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useLoginLockout());

      let status: LockoutStatus;
      await act(async () => {
        status = await result.current.checkLockout('user@example.com');
      });

      expect(status.locked).toBe(false);
      expect(status.attempts).toBe(0);
    });

    it('should set isChecking to true during the call and false after', async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockInvoke.mockReturnValue(pendingPromise);

      const { result } = renderHook(() => useLoginLockout());

      // Start the check (don't await yet)
      let checkPromise: Promise<LockoutStatus>;
      act(() => {
        checkPromise = result.current.checkLockout('user@example.com');
      });

      // isChecking should be true while in flight
      expect(result.current.isChecking).toBe(true);

      // Resolve
      await act(async () => {
        resolvePromise!({ data: { locked: false, attempts: 0 }, error: null });
        await checkPromise;
      });

      // isChecking should be false again
      expect(result.current.isChecking).toBe(false);
    });

    it('should handle missing fields in the response gracefully', async () => {
      // Edge function returns partial data
      mockInvoke.mockResolvedValue({
        data: {},
        error: null,
      });

      const { result } = renderHook(() => useLoginLockout());

      let status: LockoutStatus;
      await act(async () => {
        status = await result.current.checkLockout('user@example.com');
      });

      expect(status.locked).toBe(false);
      expect(status.attempts).toBe(0);
      expect(status.remainingSeconds).toBeUndefined();
      expect(status.unlockAt).toBeUndefined();
      expect(status.message).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // recordAttempt
  // ---------------------------------------------------------------------------
  describe('recordAttempt', () => {
    it('should record a failed login attempt', async () => {
      mockInvoke.mockResolvedValue({ data: null, error: null });

      const { result } = renderHook(() => useLoginLockout());

      await act(async () => {
        await result.current.recordAttempt('user@example.com', false);
      });

      expect(mockInvoke).toHaveBeenCalledWith('check-login-lockout', {
        body: { email: 'user@example.com', action: 'record', success: false },
      });
    });

    it('should record a successful login (clears failed attempts on server)', async () => {
      mockInvoke.mockResolvedValue({ data: null, error: null });

      const { result } = renderHook(() => useLoginLockout());

      await act(async () => {
        await result.current.recordAttempt('user@example.com', true);
      });

      expect(mockInvoke).toHaveBeenCalledWith('check-login-lockout', {
        body: { email: 'user@example.com', action: 'record', success: true },
      });
    });

    it('should NOT throw when recording fails (non-blocking)', async () => {
      mockInvoke.mockRejectedValue(new Error('Network failure'));

      const { result } = renderHook(() => useLoginLockout());

      // This should NOT throw
      await act(async () => {
        await result.current.recordAttempt('user@example.com', false);
      });

      // The hook should still be usable
      expect(result.current.lockoutStatus).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Multiple users tracked independently
  // ---------------------------------------------------------------------------
  describe('multiple users', () => {
    it('should call the edge function with different emails', async () => {
      mockInvoke.mockResolvedValue({
        data: { locked: false, attempts: 0 },
        error: null,
      });

      const { result } = renderHook(() => useLoginLockout());

      await act(async () => {
        await result.current.checkLockout('alice@example.com');
      });

      await act(async () => {
        await result.current.checkLockout('bob@example.com');
      });

      expect(mockInvoke).toHaveBeenCalledTimes(2);
      expect(mockInvoke).toHaveBeenCalledWith('check-login-lockout', {
        body: { email: 'alice@example.com', action: 'check' },
      });
      expect(mockInvoke).toHaveBeenCalledWith('check-login-lockout', {
        body: { email: 'bob@example.com', action: 'check' },
      });
    });

    it('should update lockoutStatus to the most recent check', async () => {
      mockInvoke
        .mockResolvedValueOnce({
          data: { locked: true, attempts: 5, message: 'Alice locked' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { locked: false, attempts: 1, message: 'Bob not locked' },
          error: null,
        });

      const { result } = renderHook(() => useLoginLockout());

      await act(async () => {
        await result.current.checkLockout('alice@example.com');
      });
      expect(result.current.lockoutStatus?.locked).toBe(true);

      await act(async () => {
        await result.current.checkLockout('bob@example.com');
      });
      expect(result.current.lockoutStatus?.locked).toBe(false);
      expect(result.current.lockoutStatus?.message).toBe('Bob not locked');
    });
  });

  // ---------------------------------------------------------------------------
  // Lockout duration / expiry information
  // ---------------------------------------------------------------------------
  describe('lockout duration and expiry', () => {
    it('should expose remainingSeconds for countdown timers', async () => {
      mockInvoke.mockResolvedValue({
        data: {
          locked: true,
          attempts: 5,
          remaining_seconds: 180,
          unlock_at: '2026-03-27T12:03:00Z',
        },
        error: null,
      });

      const { result } = renderHook(() => useLoginLockout());

      await act(async () => {
        await result.current.checkLockout('user@example.com');
      });

      expect(result.current.lockoutStatus?.remainingSeconds).toBe(180);
      expect(result.current.lockoutStatus?.unlockAt).toBe('2026-03-27T12:03:00Z');
    });

    it('should return no remainingSeconds when not locked', async () => {
      mockInvoke.mockResolvedValue({
        data: { locked: false, attempts: 2 },
        error: null,
      });

      const { result } = renderHook(() => useLoginLockout());

      await act(async () => {
        await result.current.checkLockout('user@example.com');
      });

      expect(result.current.lockoutStatus?.remainingSeconds).toBeUndefined();
    });
  });
});
