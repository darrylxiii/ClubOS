/**
 * HTML sanitization utilities for email content.
 * Prevents HTML/XSS injection when embedding user-supplied text in email templates.
 */

/**
 * Escape HTML special characters in user-supplied text.
 * Use this on ALL user-provided strings before embedding in email HTML.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Sanitize user input for safe embedding in email templates.
 * Escapes HTML and trims whitespace. Returns empty string for nullish values.
 */
export function sanitizeForEmail(input: string | null | undefined): string {
  if (!input) return '';
  return escapeHtml(input.trim());
}

/**
 * Sanitize user input and truncate to a maximum length.
 * Useful for device info, user agents, and other potentially long strings.
 */
export function sanitizeTruncate(input: string | null | undefined, maxLength: number): string {
  if (!input) return '';
  const trimmed = input.trim().slice(0, maxLength);
  return escapeHtml(trimmed);
}
