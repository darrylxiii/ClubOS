import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mapSupabaseError } from '../supabaseErrorMapper';

// Mock the error logger
vi.mock('@/hooks/useErrorLogger', () => ({
  standaloneErrorLogger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

describe('supabaseErrorMapper', () => {
  describe('mapSupabaseError', () => {
    it('should return default error for null', () => {
      const result = mapSupabaseError(null);
      expect(result.errorCategory).toBe('unknown');
      expect(result.isRetryable).toBe(false);
    });

    it('should return default error for undefined', () => {
      const result = mapSupabaseError(undefined);
      expect(result.errorCategory).toBe('unknown');
    });

    it('should map constraint violation error (23505)', () => {
      const error = { code: '23505', message: 'duplicate key value' };
      const result = mapSupabaseError(error);
      
      expect(result.errorCategory).toBe('constraint');
      expect(result.isRetryable).toBe(false);
      expect(result.userMessage).toContain('already exists');
    });

    it('should map null constraint error (23502)', () => {
      const error = { code: '23502', message: 'not-null constraint' };
      const result = mapSupabaseError(error);
      
      expect(result.errorCategory).toBe('validation');
      expect(result.userMessage).toContain('Required information');
    });

    it('should map permission error (42501)', () => {
      const error = { code: '42501', message: 'permission denied' };
      const result = mapSupabaseError(error);
      
      expect(result.errorCategory).toBe('permission');
      expect(result.userMessage).toContain('permission');
    });

    it('should map auth error (28000)', () => {
      const error = { code: '28000', message: 'invalid authorization' };
      const result = mapSupabaseError(error);
      
      expect(result.errorCategory).toBe('auth');
      expect(result.userMessage).toContain('session');
    });

    it('should map server overload error (53000)', () => {
      const error = { code: '53000', message: 'server overloaded' };
      const result = mapSupabaseError(error);
      
      expect(result.errorCategory).toBe('server');
      expect(result.isRetryable).toBe(true);
    });

    it('should map timeout error (57014)', () => {
      const error = { code: '57014', message: 'query cancelled' };
      const result = mapSupabaseError(error);
      
      expect(result.errorCategory).toBe('server');
      expect(result.isRetryable).toBe(true);
      expect(result.userMessage).toContain('too long');
    });

    it('should map connection error (08000)', () => {
      const error = { code: '08000', message: 'connection failed' };
      const result = mapSupabaseError(error);
      
      expect(result.errorCategory).toBe('network');
      expect(result.isRetryable).toBe(true);
    });

    it('should detect RLS policy errors', () => {
      const error = { message: 'row-level security policy denied' };
      const result = mapSupabaseError(error);
      
      expect(result.errorCategory).toBe('permission');
      expect(result.userMessage).toContain('permission');
    });

    it('should detect network errors from message', () => {
      const error = { message: 'fetch failed: network error' };
      const result = mapSupabaseError(error);
      
      expect(result.errorCategory).toBe('network');
      expect(result.isRetryable).toBe(true);
    });

    it('should detect auth errors from message', () => {
      const error = { message: 'JWT token expired' };
      const result = mapSupabaseError(error);
      
      expect(result.errorCategory).toBe('auth');
      expect(result.userMessage).toContain('session');
    });

    it('should handle string errors', () => {
      const result = mapSupabaseError('Something went wrong');
      expect(result.technicalMessage).toBe('Something went wrong');
    });

    it('should handle nested Supabase error structure', () => {
      const error = {
        error: { code: '23505', message: 'duplicate key' },
      };
      const result = mapSupabaseError(error);
      
      expect(result.errorCategory).toBe('constraint');
    });

    it('should map Supabase-specific error PGRST301', () => {
      const error = { code: 'PGRST301', message: 'JWT expired' };
      const result = mapSupabaseError(error);
      
      expect(result.errorCategory).toBe('auth');
    });

    it('should map Supabase-specific error PGRST116', () => {
      const error = { code: 'PGRST116', message: 'Not found' };
      const result = mapSupabaseError(error);
      
      expect(result.errorCategory).toBe('validation');
      expect(result.userMessage).toContain('not found');
    });
  });
});
