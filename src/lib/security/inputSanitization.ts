/**
 * Input Sanitization Utilities
 * Prevent XSS and injection attacks
 */

import DOMPurify from 'dompurify';

export interface SanitizeOptions {
  allowedTags?: string[];
  allowedAttributes?: string[];
  allowDataAttributes?: boolean;
  stripScripts?: boolean;
}

const DEFAULT_ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre',
];

const DEFAULT_ALLOWED_ATTRIBUTES = ['href', 'target', 'rel', 'class'];

/**
 * Sanitize HTML content to prevent XSS
 */
export function sanitizeHtml(
  dirty: string,
  options: SanitizeOptions = {}
): string {
  const {
    allowedTags = DEFAULT_ALLOWED_TAGS,
    allowedAttributes = DEFAULT_ALLOWED_ATTRIBUTES,
    allowDataAttributes = false,
  } = options;

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: allowedAttributes,
    ALLOW_DATA_ATTR: allowDataAttributes,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  });
}

/**
 * Sanitize plain text (remove all HTML)
 */
export function sanitizeText(dirty: string): string {
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
}

/**
 * Sanitize URL to prevent javascript: protocol attacks
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim().toLowerCase();
  
  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  for (const protocol of dangerousProtocols) {
    if (trimmed.startsWith(protocol)) {
      console.warn(`[Sanitize] Blocked dangerous URL: ${url}`);
      return '';
    }
  }

  // Allow relative URLs, http, https, mailto, tel
  const safeProtocols = ['http://', 'https://', 'mailto:', 'tel:', '/'];
  const isRelative = !trimmed.includes(':');
  const isSafe = safeProtocols.some((p) => trimmed.startsWith(p));

  if (isRelative || isSafe) {
    return url;
  }

  console.warn(`[Sanitize] Blocked unknown protocol URL: ${url}`);
  return '';
}

/**
 * Sanitize filename for safe storage
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')  // Replace unsafe chars
    .replace(/_{2,}/g, '_')             // Collapse multiple underscores
    .replace(/^\\.+/, '')                // Remove leading dots
    .slice(0, 255);                     // Limit length
}

/**
 * Sanitize SQL identifier (table/column names)
 */
export function sanitizeSqlIdentifier(identifier: string): string {
  // Only allow alphanumeric and underscore
  return identifier.replace(/[^a-zA-Z0-9_]/g, '');
}

/**
 * Escape string for use in regular expression
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  
  if (!emailRegex.test(trimmed)) {
    return null;
  }

  // Additional validation
  if (trimmed.length > 254) {
    return null;
  }

  return trimmed;
}

/**
 * Sanitize phone number
 */
export function sanitizePhone(phone: string): string {
  // Keep only digits and common phone characters
  return phone.replace(/[^\\d+\\-.()\\s]/g, '').slice(0, 20);
}

/**
 * Sanitize JSON input
 */
export function sanitizeJson<T>(input: unknown, schema?: {
  maxDepth?: number;
  maxKeys?: number;
  maxStringLength?: number;
}): T | null {
  const { maxDepth = 10, maxKeys = 100, maxStringLength = 10000 } = schema ?? {};

  function sanitizeValue(value: unknown, depth: number): unknown {
    if (depth > maxDepth) {
      throw new Error('JSON depth exceeded');
    }

    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      if (value.length > maxStringLength) {
        return value.slice(0, maxStringLength);
      }
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.slice(0, maxKeys).map((v) => sanitizeValue(v, depth + 1));
    }

    if (typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.length > maxKeys) {
        throw new Error('JSON key count exceeded');
      }

      const result: Record<string, unknown> = {};
      for (const key of keys.slice(0, maxKeys)) {
        result[key] = sanitizeValue((value as Record<string, unknown>)[key], depth + 1);
      }
      return result;
    }

    return null;
  }

  try {
    return sanitizeValue(input, 0) as T;
  } catch (_e) {
    console.warn('[Sanitize] JSON sanitization failed:', e);
    return null;
  }
}
