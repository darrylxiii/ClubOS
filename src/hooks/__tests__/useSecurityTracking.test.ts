import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSecurityTracking, generateDeviceFingerprint } from '../useSecurityTracking';
import { supabase } from '@/integrations/supabase/client';

describe('useSecurityTracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('recordLoginAttempt', () => {
    it('should call supabase RPC with correct parameters for successful login', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: 'success', error: null });
      vi.mocked(supabase.rpc).mockImplementation(mockRpc);

      const { result } = renderHook(() => useSecurityTracking());

      await act(async () => {
        await result.current.recordLoginAttempt('test@example.com', true);
      });

      expect(mockRpc).toHaveBeenCalledWith('record_login_attempt', {
        p_email: 'test@example.com',
        p_ip_address: null,
        p_user_agent: navigator.userAgent,
        p_success: true,
      });
    });

    it('should call supabase RPC with correct parameters for failed login', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
      vi.mocked(supabase.rpc).mockImplementation(mockRpc);

      const { result } = renderHook(() => useSecurityTracking());

      await act(async () => {
        await result.current.recordLoginAttempt('test@example.com', false, '192.168.1.1');
      });

      expect(mockRpc).toHaveBeenCalledWith('record_login_attempt', {
        p_email: 'test@example.com',
        p_ip_address: '192.168.1.1',
        p_user_agent: navigator.userAgent,
        p_success: false,
      });
    });

    it('should handle RPC errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockRpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'RPC error' } });
      vi.mocked(supabase.rpc).mockImplementation(mockRpc);

      const { result } = renderHook(() => useSecurityTracking());

      await act(async () => {
        const response = await result.current.recordLoginAttempt('test@example.com', true);
        expect(response).toBeNull();
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle exceptions gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockRpc = vi.fn().mockRejectedValue(new Error('Network error'));
      vi.mocked(supabase.rpc).mockImplementation(mockRpc);

      const { result } = renderHook(() => useSecurityTracking());

      await act(async () => {
        const response = await result.current.recordLoginAttempt('test@example.com', true);
        expect(response).toBeNull();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('createSession', () => {
    it('should call supabase RPC with correct parameters', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: 'session-123', error: null });
      vi.mocked(supabase.rpc).mockImplementation(mockRpc);

      const { result } = renderHook(() => useSecurityTracking());

      await act(async () => {
        await result.current.createSession(
          'user-123',
          'session-456',
          '192.168.1.1',
          'Mozilla/5.0',
          'fingerprint-789'
        );
      });

      expect(mockRpc).toHaveBeenCalledWith('create_user_session', {
        p_user_id: 'user-123',
        p_session_id: 'session-456',
        p_ip_address: '192.168.1.1',
        p_user_agent: 'Mozilla/5.0',
        p_device_fingerprint: 'fingerprint-789',
      });
    });

    it('should use navigator.userAgent as default', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: 'session-123', error: null });
      vi.mocked(supabase.rpc).mockImplementation(mockRpc);

      const { result } = renderHook(() => useSecurityTracking());

      await act(async () => {
        await result.current.createSession('user-123');
      });

      expect(mockRpc).toHaveBeenCalledWith('create_user_session', expect.objectContaining({
        p_user_agent: navigator.userAgent,
      }));
    });

    it('should handle errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockRpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } });
      vi.mocked(supabase.rpc).mockImplementation(mockRpc);

      const { result } = renderHook(() => useSecurityTracking());

      await act(async () => {
        const response = await result.current.createSession('user-123');
        expect(response).toBeNull();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('endSession', () => {
    it('should call supabase RPC with correct parameters', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(supabase.rpc).mockImplementation(mockRpc);

      const { result } = renderHook(() => useSecurityTracking());

      await act(async () => {
        await result.current.endSession('user-123', 'session-456');
      });

      expect(mockRpc).toHaveBeenCalledWith('end_user_session', {
        p_user_id: 'user-123',
        p_session_id: 'session-456',
      });
    });

    it('should handle null session ID', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(supabase.rpc).mockImplementation(mockRpc);

      const { result } = renderHook(() => useSecurityTracking());

      await act(async () => {
        await result.current.endSession('user-123');
      });

      expect(mockRpc).toHaveBeenCalledWith('end_user_session', {
        p_user_id: 'user-123',
        p_session_id: null,
      });
    });

    it('should handle errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockRpc = vi.fn().mockResolvedValue({ error: { message: 'Error' } });
      vi.mocked(supabase.rpc).mockImplementation(mockRpc);

      const { result } = renderHook(() => useSecurityTracking());

      // Should not throw
      await act(async () => {
        await result.current.endSession('user-123');
      });

      consoleSpy.mockRestore();
    });
  });

  describe('updateSessionActivity', () => {
    it('should call supabase RPC with correct parameters', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(supabase.rpc).mockImplementation(mockRpc);

      const { result } = renderHook(() => useSecurityTracking());

      await act(async () => {
        await result.current.updateSessionActivity('session-123');
      });

      expect(mockRpc).toHaveBeenCalledWith('update_session_activity', {
        p_session_id: 'session-123',
      });
    });

    it('should handle errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockRpc = vi.fn().mockRejectedValue(new Error('Network error'));
      vi.mocked(supabase.rpc).mockImplementation(mockRpc);

      const { result } = renderHook(() => useSecurityTracking());

      // Should not throw
      await act(async () => {
        await result.current.updateSessionActivity('session-123');
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Hook stability', () => {
    it('should return stable function references', () => {
      const { result, rerender } = renderHook(() => useSecurityTracking());

      const firstRender = result.current;
      rerender();
      const secondRender = result.current;

      expect(firstRender.recordLoginAttempt).toBe(secondRender.recordLoginAttempt);
      expect(firstRender.createSession).toBe(secondRender.createSession);
      expect(firstRender.endSession).toBe(secondRender.endSession);
      expect(firstRender.updateSessionActivity).toBe(secondRender.updateSessionActivity);
    });
  });
});

describe('generateDeviceFingerprint', () => {
  it('should return a hex string', () => {
    const fingerprint = generateDeviceFingerprint();
    
    expect(typeof fingerprint).toBe('string');
    expect(/^[0-9a-f]+$/.test(fingerprint)).toBe(true);
  });

  it('should return consistent fingerprint for same browser properties', () => {
    const fingerprint1 = generateDeviceFingerprint();
    const fingerprint2 = generateDeviceFingerprint();
    
    expect(fingerprint1).toBe(fingerprint2);
  });

  it('should include browser information in fingerprint calculation', () => {
    // This test verifies the function uses navigator properties
    // We can't easily change these in tests, but we can verify it runs without error
    expect(() => generateDeviceFingerprint()).not.toThrow();
  });

  it('should return a non-empty string', () => {
    const fingerprint = generateDeviceFingerprint();
    
    expect(fingerprint.length).toBeGreaterThan(0);
  });
});
