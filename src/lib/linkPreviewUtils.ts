export interface LinkPreviewData {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  publishedDate?: string;
  author?: string;
}

/**
 * Fetch metadata from a URL by parsing OpenGraph tags
 */
export async function fetchLinkPreview(url: string): Promise<LinkPreviewData> {
  try {
    // For now, return empty object - can be enhanced with a CORS proxy or edge function
    // In production, you'd want to use a service or edge function to fetch and parse
    console.log('Link preview fetch for:', url);
    return {};
  } catch (error) {
    console.error('Error fetching link preview:', error);
    return {};
  }
}

/**
 * Extract domain from URL for display
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
