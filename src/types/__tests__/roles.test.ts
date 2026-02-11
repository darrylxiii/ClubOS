import { describe, it, expect } from 'vitest';
import { ROLE_PRIORITY, getRolePriority } from '@/types/roles';
import type { UserRole } from '@/types/roles';

describe('roles', () => {
  describe('ROLE_PRIORITY', () => {
    it('has admin as highest priority', () => {
      expect(ROLE_PRIORITY[0]).toBe('admin');
    });

    it('has user as lowest priority', () => {
      expect(ROLE_PRIORITY[ROLE_PRIORITY.length - 1]).toBe('user');
    });

    it('contains expected roles in order', () => {
      expect(ROLE_PRIORITY).toEqual(['admin', 'strategist', 'partner', 'user']);
    });
  });

  describe('getRolePriority', () => {
    it('returns 0 for admin (highest)', () => {
      expect(getRolePriority('admin')).toBe(0);
    });

    it('returns 1 for strategist', () => {
      expect(getRolePriority('strategist')).toBe(1);
    });

    it('returns 2 for partner', () => {
      expect(getRolePriority('partner')).toBe(2);
    });

    it('returns 3 for user', () => {
      expect(getRolePriority('user')).toBe(3);
    });

    it('returns -1 for null role', () => {
      expect(getRolePriority(null)).toBe(-1);
    });

    it('returns length for unknown roles', () => {
      expect(getRolePriority('company_admin')).toBe(ROLE_PRIORITY.length);
    });
  });
});
