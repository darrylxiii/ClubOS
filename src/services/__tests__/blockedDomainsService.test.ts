import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  addBlockedDomain, 
  removeBlockedDomain, 
  isCompanyBlocked 
} from '../blockedDomainsService';
import { supabase } from '@/integrations/supabase/client';

describe('blockedDomainsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addBlockedDomain', () => {
    it('should add a blocked domain', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123' } as any },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'blocked-1',
            company_name: 'Test Company',
            domain: 'test.com',
            user_id: 'user-123',
          },
          error: null,
        }),
      } as any);

      const result = await addBlockedDomain('Test Company', 'test.com');

      expect(result.id).toBe('blocked-1');
      expect(result.domain).toBe('test.com');
    });

    it('should add a blocked domain with reason', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123' } as any },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'blocked-1',
            company_name: 'Test Company',
            domain: 'test.com',
            reason: 'Current employer',
          },
          error: null,
        }),
      } as any);

      const result = await addBlockedDomain('Test Company', 'test.com', 'Current employer');

      expect(result).toBeDefined();
    });

    it('should throw error when not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(addBlockedDomain('Test', 'test.com')).rejects.toThrow('Not authenticated');
    });

    it('should throw error on database failure', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123' } as any },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Duplicate entry'),
        }),
      } as any);

      await expect(addBlockedDomain('Test', 'test.com')).rejects.toThrow();
    });
  });

  describe('removeBlockedDomain', () => {
    it('should remove a blocked domain', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      } as any);

      await expect(removeBlockedDomain('blocked-123')).resolves.not.toThrow();
    });

    it('should throw error on delete failure', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: new Error('Delete failed') }),
      } as any);

      await expect(removeBlockedDomain('blocked-123')).rejects.toThrow();
    });
  });

  describe('isCompanyBlocked', () => {
    it('should return true when company is blocked', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: true,
        error: null,
      } as any);

      const result = await isCompanyBlocked('candidate-123', 'hr@blocked.com');

      expect(result).toBe(true);
    });

    it('should return false when company is not blocked', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: false,
        error: null,
      } as any);

      const result = await isCompanyBlocked('candidate-123', 'hr@allowed.com');

      expect(result).toBe(false);
    });

    it('should return false on null response', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null,
      } as any);

      const result = await isCompanyBlocked('candidate-123', 'hr@test.com');

      expect(result).toBe(false);
    });

    it('should throw error on RPC failure', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: new Error('RPC failed'),
      } as any);

      await expect(isCompanyBlocked('candidate-123', 'hr@test.com')).rejects.toThrow();
    });
  });
});
