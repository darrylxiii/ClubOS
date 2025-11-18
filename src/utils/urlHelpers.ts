/**
 * Ensures a URL has an https:// protocol prefix
 * Handles URLs that may be stored without the protocol
 * @param url - The URL to normalize
 * @returns The URL with https:// prefix, or null if invalid
 */
export const ensureHttpsUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  
  const trimmed = url.trim();
  if (!trimmed) return null;
  
  // Already has protocol
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  
  // Add https://
  return `https://${trimmed}`;
};
