import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sanitizeHtml,
  sanitizeText,
  sanitizeUrl,
  sanitizeFilename,
  sanitizeSqlIdentifier,
  escapeRegExp,
  sanitizeEmail,
  sanitizePhone,
  sanitizeJson,
} from '../inputSanitization';

describe('inputSanitization', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  // ---------------------------------------------------------------------------
  // sanitizeHtml
  // ---------------------------------------------------------------------------
  describe('sanitizeHtml', () => {
    it('should strip <script> tags completely', () => {
      const result = sanitizeHtml('<p>Hello</p><script>alert("xss")</script>');
      expect(result).not.toContain('<script');
      expect(result).not.toContain('alert');
      expect(result).toContain('<p>Hello</p>');
    });

    it('should strip <iframe> tags', () => {
      const result = sanitizeHtml('<iframe src="https://evil.com"></iframe>');
      expect(result).not.toContain('<iframe');
    });

    it('should strip <style> tags', () => {
      const result = sanitizeHtml('<style>body{display:none}</style><p>Hi</p>');
      expect(result).not.toContain('<style');
      expect(result).toContain('<p>Hi</p>');
    });

    it('should strip event handler attributes (onerror, onclick, etc.)', () => {
      const result = sanitizeHtml('<img onerror="alert(1)" src="x">');
      expect(result).not.toContain('onerror');
      expect(result).not.toContain('alert');
    });

    it('should strip onload attributes', () => {
      const result = sanitizeHtml('<body onload="alert(1)">content</body>');
      expect(result).not.toContain('onload');
    });

    it('should strip onmouseover attributes', () => {
      const result = sanitizeHtml('<div onmouseover="alert(1)">hover</div>');
      expect(result).not.toContain('onmouseover');
    });

    it('should allow safe tags (p, strong, em, a, ul, ol, li)', () => {
      const input = '<p>Paragraph</p><strong>Bold</strong><em>Italic</em>';
      const result = sanitizeHtml(input);
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
      expect(result).toContain('<em>');
    });

    it('should allow heading tags', () => {
      const input = '<h1>Title</h1><h2>Subtitle</h2>';
      const result = sanitizeHtml(input);
      expect(result).toContain('<h1>');
      expect(result).toContain('<h2>');
    });

    it('should allow list elements', () => {
      const input = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const result = sanitizeHtml(input);
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>');
    });

    it('should allow href attribute on anchor tags', () => {
      const input = '<a href="https://example.com">Link</a>';
      const result = sanitizeHtml(input);
      expect(result).toContain('href="https://example.com"');
    });

    it('should strip <object> and <embed> tags', () => {
      const result = sanitizeHtml('<object data="evil.swf"></object><embed src="evil.swf">');
      expect(result).not.toContain('<object');
      expect(result).not.toContain('<embed');
    });

    it('should strip <form> tags', () => {
      const result = sanitizeHtml('<form action="https://evil.com"><input></form>');
      expect(result).not.toContain('<form');
    });

    it('should handle empty strings', () => {
      expect(sanitizeHtml('')).toBe('');
    });

    it('should handle plain text (no HTML)', () => {
      expect(sanitizeHtml('plain text')).toBe('plain text');
    });

    it('should respect custom allowedTags option', () => {
      const result = sanitizeHtml('<div>content</div><p>para</p>', {
        allowedTags: ['div'],
      });
      expect(result).toContain('<div>');
      // p is not in custom allowed list so it may be stripped
    });
  });

  // ---------------------------------------------------------------------------
  // sanitizeText
  // ---------------------------------------------------------------------------
  describe('sanitizeText', () => {
    it('should remove ALL HTML tags', () => {
      const result = sanitizeText('<p>Hello <strong>world</strong></p>');
      expect(result).toBe('Hello world');
    });

    it('should remove script tags and their content', () => {
      const result = sanitizeText('safe<script>evil()</script>text');
      expect(result).not.toContain('script');
      expect(result).not.toContain('evil');
    });

    it('should handle empty string', () => {
      expect(sanitizeText('')).toBe('');
    });

    it('should pass through plain text unchanged', () => {
      expect(sanitizeText('just text')).toBe('just text');
    });
  });

  // ---------------------------------------------------------------------------
  // sanitizeUrl
  // ---------------------------------------------------------------------------
  describe('sanitizeUrl', () => {
    it('should block javascript: protocol', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    });

    it('should block javascript: with mixed case', () => {
      expect(sanitizeUrl('JavaScript:alert(1)')).toBe('');
    });

    it('should block javascript: with leading whitespace', () => {
      expect(sanitizeUrl('  javascript:alert(1)')).toBe('');
    });

    it('should block data: protocol', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    });

    it('should block vbscript: protocol', () => {
      expect(sanitizeUrl('vbscript:MsgBox("XSS")')).toBe('');
    });

    it('should block file: protocol', () => {
      expect(sanitizeUrl('file:///etc/passwd')).toBe('');
    });

    it('should allow https:// URLs', () => {
      const url = 'https://example.com/page';
      expect(sanitizeUrl(url)).toBe(url);
    });

    it('should allow http:// URLs', () => {
      const url = 'http://example.com/page';
      expect(sanitizeUrl(url)).toBe(url);
    });

    it('should allow mailto: URLs', () => {
      const url = 'mailto:user@example.com';
      expect(sanitizeUrl(url)).toBe(url);
    });

    it('should allow tel: URLs', () => {
      const url = 'tel:+15551234567';
      expect(sanitizeUrl(url)).toBe(url);
    });

    it('should allow relative URLs', () => {
      expect(sanitizeUrl('/about')).toBe('/about');
      expect(sanitizeUrl('page.html')).toBe('page.html');
    });

    it('should allow root-relative URLs starting with /', () => {
      expect(sanitizeUrl('/api/data')).toBe('/api/data');
    });

    it('should block unknown protocols', () => {
      expect(sanitizeUrl('ftp://evil.com/malware.exe')).toBe('');
    });

    it('should preserve original casing of safe URLs', () => {
      const url = 'https://Example.COM/Path?Q=Value';
      expect(sanitizeUrl(url)).toBe(url);
    });

    it('should handle empty string', () => {
      expect(sanitizeUrl('')).toBe('');
    });
  });

  // ---------------------------------------------------------------------------
  // sanitizeFilename
  // ---------------------------------------------------------------------------
  describe('sanitizeFilename', () => {
    it('should replace special characters with underscores and collapse them', () => {
      // spaces and parens become _, then consecutive _ collapse
      expect(sanitizeFilename('my file (1).pdf')).toBe('my_file_1_.pdf');
    });

    it('should replace path separators with underscores', () => {
      const result = sanitizeFilename('../../../etc/passwd');
      expect(result).not.toContain('/');
      // leading dots are removed, internal dots remain
      expect(result).not.toMatch(/^\./);
    });

    it('should remove leading dots', () => {
      expect(sanitizeFilename('..hidden-file')).not.toMatch(/^\./);
    });

    it('should collapse multiple underscores', () => {
      expect(sanitizeFilename('a   b   c')).toBe('a_b_c');
    });

    it('should truncate filenames longer than 255 chars', () => {
      const longName = 'a'.repeat(300) + '.txt';
      const result = sanitizeFilename(longName);
      expect(result.length).toBeLessThanOrEqual(255);
    });

    it('should allow safe characters (alphanumeric, dot, dash, underscore)', () => {
      expect(sanitizeFilename('report-2024_final.pdf')).toBe('report-2024_final.pdf');
    });

    it('should handle empty string', () => {
      expect(sanitizeFilename('')).toBe('');
    });

    it('should remove shell metacharacters', () => {
      const result = sanitizeFilename('file;rm -rf /.txt');
      expect(result).not.toContain(';');
      expect(result).not.toContain(' ');
    });

    it('should strip backslashes (Windows path separators)', () => {
      const result = sanitizeFilename('..\\..\\Windows\\System32\\config');
      expect(result).not.toContain('\\');
    });
  });

  // ---------------------------------------------------------------------------
  // sanitizeSqlIdentifier
  // ---------------------------------------------------------------------------
  describe('sanitizeSqlIdentifier', () => {
    it('should allow alphanumeric and underscore', () => {
      expect(sanitizeSqlIdentifier('users_table_1')).toBe('users_table_1');
    });

    it('should strip SQL injection characters', () => {
      expect(sanitizeSqlIdentifier("users'; DROP TABLE users;--")).toBe(
        'usersDROPTABLEusers'
      );
    });

    it('should strip spaces', () => {
      expect(sanitizeSqlIdentifier('user name')).toBe('username');
    });

    it('should strip special characters', () => {
      expect(sanitizeSqlIdentifier('col@name!')).toBe('colname');
    });

    it('should handle empty string', () => {
      expect(sanitizeSqlIdentifier('')).toBe('');
    });
  });

  // ---------------------------------------------------------------------------
  // escapeRegExp
  // ---------------------------------------------------------------------------
  describe('escapeRegExp', () => {
    it('should escape dots', () => {
      expect(escapeRegExp('file.txt')).toBe('file\\.txt');
    });

    it('should escape all regex special characters', () => {
      const special = '.*+?^${}()|[]\\';
      const escaped = escapeRegExp(special);
      // Using the escaped string to build a regex should not throw
      expect(() => new RegExp(escaped)).not.toThrow();
    });

    it('should leave plain strings unchanged', () => {
      expect(escapeRegExp('hello')).toBe('hello');
    });

    it('should handle empty string', () => {
      expect(escapeRegExp('')).toBe('');
    });
  });

  // ---------------------------------------------------------------------------
  // sanitizeEmail
  // ---------------------------------------------------------------------------
  describe('sanitizeEmail', () => {
    it('should accept a valid email', () => {
      expect(sanitizeEmail('user@example.com')).toBe('user@example.com');
    });

    it('should lowercase the email', () => {
      expect(sanitizeEmail('User@EXAMPLE.COM')).toBe('user@example.com');
    });

    it('should trim whitespace', () => {
      expect(sanitizeEmail('  user@example.com  ')).toBe('user@example.com');
    });

    it('should reject email without @', () => {
      expect(sanitizeEmail('userexample.com')).toBeNull();
    });

    it('should reject email without domain', () => {
      expect(sanitizeEmail('user@')).toBeNull();
    });

    it('should reject email without TLD', () => {
      expect(sanitizeEmail('user@example')).toBeNull();
    });

    it('should reject empty string', () => {
      expect(sanitizeEmail('')).toBeNull();
    });

    it('should reject email with spaces in it', () => {
      expect(sanitizeEmail('user @example.com')).toBeNull();
    });

    it('should reject email longer than 254 characters', () => {
      const longLocal = 'a'.repeat(250);
      expect(sanitizeEmail(`${longLocal}@example.com`)).toBeNull();
    });

    it('should accept email with subdomains', () => {
      expect(sanitizeEmail('user@mail.example.co.uk')).toBe('user@mail.example.co.uk');
    });

    it('should accept email with plus addressing', () => {
      expect(sanitizeEmail('user+tag@example.com')).toBe('user+tag@example.com');
    });
  });

  // ---------------------------------------------------------------------------
  // sanitizePhone
  // ---------------------------------------------------------------------------
  describe('sanitizePhone', () => {
    it('should allow standard phone number characters', () => {
      expect(sanitizePhone('+1 (555) 123-4567')).toBe('+1 (555) 123-4567');
    });

    it('should strip letters and unsafe characters', () => {
      expect(sanitizePhone('555-CALL-ME!')).toBe('555--');
    });

    it('should truncate to 20 characters', () => {
      const long = '1'.repeat(30);
      expect(sanitizePhone(long).length).toBeLessThanOrEqual(20);
    });

    it('should handle empty string', () => {
      expect(sanitizePhone('')).toBe('');
    });
  });

  // ---------------------------------------------------------------------------
  // sanitizeJson
  // ---------------------------------------------------------------------------
  describe('sanitizeJson', () => {
    it('should pass through simple objects', () => {
      const input = { name: 'Alice', age: 30 };
      expect(sanitizeJson(input)).toEqual({ name: 'Alice', age: 30 });
    });

    it('should pass through arrays', () => {
      const input = [1, 2, 3];
      expect(sanitizeJson(input)).toEqual([1, 2, 3]);
    });

    it('should pass through null and undefined', () => {
      expect(sanitizeJson(null)).toBeNull();
      expect(sanitizeJson(undefined)).toBeUndefined();
    });

    it('should pass through booleans', () => {
      expect(sanitizeJson(true)).toBe(true);
      expect(sanitizeJson(false)).toBe(false);
    });

    it('should truncate strings exceeding maxStringLength', () => {
      const longString = 'x'.repeat(200);
      const result = sanitizeJson<string>(longString, { maxStringLength: 100 });
      expect(result).toHaveLength(100);
    });

    it('should not truncate strings within maxStringLength', () => {
      const short = 'hello';
      const result = sanitizeJson<string>(short, { maxStringLength: 100 });
      expect(result).toBe('hello');
    });

    it('should return null when JSON depth is exceeded', () => {
      // Build deeply nested object
      let obj: any = { value: 'deep' };
      for (let i = 0; i < 15; i++) {
        obj = { nested: obj };
      }

      const result = sanitizeJson(obj, { maxDepth: 5 });
      expect(result).toBeNull();
    });

    it('should return null when key count is exceeded', () => {
      const manyKeys: Record<string, number> = {};
      for (let i = 0; i < 150; i++) {
        manyKeys[`key_${i}`] = i;
      }

      const result = sanitizeJson(manyKeys, { maxKeys: 50 });
      expect(result).toBeNull();
    });

    it('should truncate arrays to maxKeys entries', () => {
      const bigArray = Array.from({ length: 200 }, (_, i) => i);
      const result = sanitizeJson<number[]>(bigArray, { maxKeys: 10 });
      expect(result).toHaveLength(10);
    });

    it('should handle nested objects and arrays', () => {
      const input = {
        users: [
          { name: 'Alice', tags: ['admin', 'user'] },
          { name: 'Bob', tags: ['user'] },
        ],
      };
      const result = sanitizeJson(input);
      expect(result).toEqual(input);
    });

    it('should use default limits when no schema provided', () => {
      // Default maxDepth=10, maxKeys=100, maxStringLength=10000
      const simple = { key: 'value' };
      expect(sanitizeJson(simple)).toEqual(simple);
    });

    it('should handle numbers as primitives', () => {
      expect(sanitizeJson(42)).toBe(42);
      expect(sanitizeJson(3.14)).toBe(3.14);
    });

    it('should return null for unsupported types (e.g., functions)', () => {
      const fn = () => {};
      expect(sanitizeJson(fn)).toBeNull();
    });
  });
});
