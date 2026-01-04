/**
 * Centralized String Utilities
 * Use these instead of inline implementations
 */

/**
 * Get initials from a name
 * @param name - The name to extract initials from
 * @param maxLength - Maximum number of initials (default: 2)
 */
export function getInitials(name: string | null | undefined, maxLength = 2): string {
  if (!name || typeof name !== 'string') return '?';
  
  return name
    .trim()
    .split(/\s+/)
    .map(word => word[0])
    .filter(Boolean)
    .slice(0, maxLength)
    .join('')
    .toUpperCase();
}

/**
 * Truncate a string to a maximum length with ellipsis
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation
 */
export function truncate(text: string | null | undefined, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Capitalize the first letter of a string
 * @param text - The text to capitalize
 */
export function capitalize(text: string | null | undefined): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Convert a string to title case
 * @param text - The text to convert
 */
export function toTitleCase(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Slugify a string for URLs
 * @param text - The text to slugify
 */
export function slugify(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
