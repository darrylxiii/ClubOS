import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  getSessionId, 
  getSessionStartTime, 
  getSessionDuration,
  getDeviceType,
  trackLogin,
  trackLogout 
} from '../sessionTracking';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  },
}));

describe('sessionTracking', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  describe('getSessionId', () => {
    it('should generate new session ID if not exists', () => {
      const sessionId = getSessionId();
      expect(sessionId).toBeTruthy();
      expect(typeof sessionId).toBe('string');
    });

    it('should return same session ID on subsequent calls', () => {
      const id1 = getSessionId();
      const id2 = getSessionId();
      expect(id1).toBe(id2);
    });
  });

  describe('getSessionStartTime', () => {
    it('should return Date object', () => {
      const startTime = getSessionStartTime();
      expect(startTime).toBeInstanceOf(Date);
    });

    it('should persist start time in sessionStorage', () => {
      const time1 = getSessionStartTime();
      const time2 = getSessionStartTime();
      expect(time1.getTime()).toBe(time2.getTime());
    });
  });

  describe('getSessionDuration', () => {
    it('should return number of minutes', () => {
      const duration = getSessionDuration();
      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getDeviceType', () => {
    it('should detect desktop', () => {
      const deviceType = getDeviceType();
      expect(['mobile', 'tablet', 'desktop']).toContain(deviceType);
    });
  });

  describe('trackLogin', () => {
    it('should track login event', async () => {
      await expect(trackLogin('user-123', 'email')).resolves.not.toThrow();
    });

    it('should reset session on login', async () => {
      const oldId = getSessionId();
      await trackLogin('user-123', 'email');
      const newId = getSessionId();
      expect(newId).not.toBe(oldId);
    });
  });

  describe('trackLogout', () => {
    it('should track logout event', async () => {
      await expect(trackLogout('user-123')).resolves.not.toThrow();
    });

    it('should clear session on logout', async () => {
      getSessionId(); // Create session
      await trackLogout('user-123');
      
      const sessionId = sessionStorage.getItem('activity_session_id');
      expect(sessionId).toBeNull();
    });
  });
});
