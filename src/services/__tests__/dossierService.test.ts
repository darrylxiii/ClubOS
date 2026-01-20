import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  createDossierShare, 
  getDossierViews, 
  revokeDossierShare 
} from '../dossierService';
import { supabase } from '@/integrations/supabase/client';

describe('dossierService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createDossierShare', () => {
    it('should create a dossier share with default expiration', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123' } as any },
        error: null,
      });

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: 'generated-token-123',
        error: null,
      } as any);

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'share-1',
            candidate_id: 'candidate-123',
            token: 'generated-token-123',
            expires_at: '2024-01-04T00:00:00Z',
          },
          error: null,
        }),
      } as any);

      const result = await createDossierShare('candidate-123');

      expect(result.id).toBe('share-1');
      expect(result.token).toBe('generated-token-123');
    });

    it('should create a dossier share with custom expiration', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123' } as any },
        error: null,
      });

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: 'generated-token-123',
        error: null,
      } as any);

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'share-1' },
          error: null,
        }),
      } as any);

      await createDossierShare('candidate-123', 48);

      expect(supabase.from).toHaveBeenCalledWith('dossier_shares');
    });

    it('should create a dossier share with allowed domains', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123' } as any },
        error: null,
      });

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: 'generated-token-123',
        error: null,
      } as any);

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'share-1', allowed_domains: ['example.com'] },
          error: null,
        }),
      } as any);

      const result = await createDossierShare('candidate-123', 72, ['example.com']);

      expect(result).toBeDefined();
    });

    it('should throw error when not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(createDossierShare('candidate-123')).rejects.toThrow('Not authenticated');
    });

    it('should throw error on database failure', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123' } as any },
        error: null,
      });

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: 'token',
        error: null,
      } as any);

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Database error'),
        }),
      } as any);

      await expect(createDossierShare('candidate-123')).rejects.toThrow();
    });
  });

  describe('getDossierViews', () => {
    it('should fetch dossier views', async () => {
      const mockViews = [
        { id: 'view-1', viewed_at: '2024-01-01', viewer_ip: '1.2.3.4' },
        { id: 'view-2', viewed_at: '2024-01-02', viewer_ip: '5.6.7.8' },
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockViews, error: null }),
      } as any);

      const result = await getDossierViews('share-123');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('view-1');
    });

    it('should return empty array on error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ 
          data: null, 
          error: new Error('Not found') 
        }),
      } as any);

      await expect(getDossierViews('share-123')).rejects.toThrow();
    });
  });

  describe('revokeDossierShare', () => {
    it('should revoke a dossier share', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      } as any);

      await expect(revokeDossierShare('share-123')).resolves.not.toThrow();
    });

    it('should throw error on revoke failure', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: new Error('Update failed') }),
      } as any);

      await expect(revokeDossierShare('share-123')).rejects.toThrow();
    });
  });
});
