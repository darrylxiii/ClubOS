import { describe, it, expect } from 'vitest';
import { ensureHttpsUrl } from '../urlHelpers';

describe('urlHelpers', () => {
  describe('ensureHttpsUrl', () => {
    it('should return null for null input', () => {
      expect(ensureHttpsUrl(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(ensureHttpsUrl(undefined)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(ensureHttpsUrl('')).toBeNull();
    });

    it('should return null for whitespace-only string', () => {
      expect(ensureHttpsUrl('   ')).toBeNull();
    });

    it('should keep https:// URL unchanged', () => {
      expect(ensureHttpsUrl('https://example.com')).toBe('https://example.com');
    });

    it('should keep http:// URL unchanged', () => {
      expect(ensureHttpsUrl('http://example.com')).toBe('http://example.com');
    });

    it('should add https:// to URL without protocol', () => {
      expect(ensureHttpsUrl('example.com')).toBe('https://example.com');
    });

    it('should add https:// to URL with path', () => {
      expect(ensureHttpsUrl('example.com/path/to/page')).toBe('https://example.com/path/to/page');
    });

    it('should trim whitespace before processing', () => {
      expect(ensureHttpsUrl('  example.com  ')).toBe('https://example.com');
    });

    it('should handle URL with query parameters', () => {
      expect(ensureHttpsUrl('example.com?param=value')).toBe('https://example.com?param=value');
    });

    it('should handle subdomain URLs', () => {
      expect(ensureHttpsUrl('sub.example.com')).toBe('https://sub.example.com');
    });

    it('should handle localhost URLs', () => {
      expect(ensureHttpsUrl('localhost:3000')).toBe('https://localhost:3000');
    });
  });
});
