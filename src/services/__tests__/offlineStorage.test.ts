import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock idb module
vi.mock('idb', () => ({
  openDB: vi.fn(() => Promise.resolve({
    put: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    getAll: vi.fn().mockResolvedValue([]),
    getAllFromIndex: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(undefined),
    transaction: vi.fn(() => ({
      store: {
        put: vi.fn(),
      },
      done: Promise.resolve(),
    })),
  })),
}));

describe('offlineStorage', () => {
  let offlineStorage: typeof import('../offlineStorage');

  beforeEach(async () => {
    vi.clearAllMocks();
    // Dynamic import to reset module state
    offlineStorage = await import('../offlineStorage');
  });

  describe('saveUserProfile', () => {
    it('should save user profile to IndexedDB', async () => {
      const userId = 'user-123';
      const profileData = { name: 'Test User', email: 'test@example.com' };
      
      await expect(
        offlineStorage.saveUserProfile(userId, profileData)
      ).resolves.not.toThrow();
    });
  });

  describe('getUserProfile', () => {
    it('should return null when no profile exists', async () => {
      const result = await offlineStorage.getUserProfile('user-123');
      expect(result).toBeNull();
    });
  });

  describe('saveJobs', () => {
    it('should save jobs array to IndexedDB', async () => {
      const jobs = [
        { id: 'job-1', title: 'Developer' },
        { id: 'job-2', title: 'Designer' },
      ];
      
      await expect(offlineStorage.saveJobs(jobs)).resolves.not.toThrow();
    });

    it('should handle empty jobs array', async () => {
      await expect(offlineStorage.saveJobs([])).resolves.not.toThrow();
    });
  });

  describe('getJobs', () => {
    it('should return empty array when no jobs exist', async () => {
      const result = await offlineStorage.getJobs();
      expect(result).toEqual([]);
    });
  });

  describe('getJob', () => {
    it('should return null when job does not exist', async () => {
      const result = await offlineStorage.getJob('nonexistent-id');
      expect(result).toBeNull();
    });
  });

  describe('saveApplications', () => {
    it('should save applications to IndexedDB', async () => {
      const applications = [
        { id: 'app-1', status: 'pending' },
        { id: 'app-2', status: 'approved' },
      ];
      
      await expect(
        offlineStorage.saveApplications(applications)
      ).resolves.not.toThrow();
    });
  });

  describe('getApplications', () => {
    it('should return empty array when no applications exist', async () => {
      const result = await offlineStorage.getApplications();
      expect(result).toEqual([]);
    });
  });

  describe('saveMessages', () => {
    it('should save messages to IndexedDB', async () => {
      const messages = [
        { id: 'msg-1', conversation_id: 'conv-1', content: 'Hello' },
        { id: 'msg-2', conversation_id: 'conv-1', content: 'Hi' },
      ];
      
      await expect(offlineStorage.saveMessages(messages)).resolves.not.toThrow();
    });
  });

  describe('getMessagesByConversation', () => {
    it('should return empty array when no messages exist', async () => {
      const result = await offlineStorage.getMessagesByConversation('conv-1');
      expect(result).toEqual([]);
    });
  });

  describe('queueOfflineAction', () => {
    it('should queue an offline action', async () => {
      const actionId = await offlineStorage.queueOfflineAction(
        'create',
        'applications',
        { jobId: 'job-1' }
      );
      
      expect(actionId).toBeDefined();
      expect(typeof actionId).toBe('string');
    });

    it('should handle different action types', async () => {
      await expect(
        offlineStorage.queueOfflineAction('update', 'profile', { name: 'New Name' })
      ).resolves.toBeDefined();
      
      await expect(
        offlineStorage.queueOfflineAction('delete', 'messages', { id: 'msg-1' })
      ).resolves.toBeDefined();
    });
  });

  describe('getOfflineActions', () => {
    it('should return empty array when no actions exist', async () => {
      const result = await offlineStorage.getOfflineActions();
      expect(result).toEqual([]);
    });
  });
});
