/**
 * Utility functions for detecting and parsing social media URLs
 */

export type SocialPlatform = 'twitter' | 'linkedin' | 'instagram' | 'youtube';

export interface SocialEmbed {
  platform: SocialPlatform;
  url: string;
  id: string;
  username?: string;
}

/**
 * Extract Twitter/X post ID from URL
 */
export function extractTwitterId(url: string): string | null {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/(?:#!\/)?(\w+)\/status\/(\d+)/,
    /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/i\/web\/status\/(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      // Return the status ID (last group)
      return match[match.length - 1];
    }
  }

  return null;
}

/**
 * Extract LinkedIn post ID from URL
 */
export function extractLinkedInId(url: string): string | null {
  const patterns = [
    /linkedin\.com\/posts\/([^/]+)[-_]([a-zA-Z0-9_-]+)/,
    /linkedin\.com\/feed\/update\/urn:li:activity:(\d+)/,
    /linkedin\.com\/feed\/update\/urn:li:share:(\d+)/,
    /linkedin\.com\/embed\/feed\/update\/urn:li:(?:share|ugcPost):(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[match.length - 1]) {
      return match[match.length - 1];
    }
  }

  return null;
}

/**
 * Extract LinkedIn username from URL
 */
export function extractLinkedInUsername(url: string): string | null {
  const match = url.match(/linkedin\.com\/posts\/([^/_-]+)/);
  return match ? match[1] : null;
}

/**
 * Extract Instagram post ID from URL
 */
export function extractInstagramId(url: string): string | null {
  const patterns = [
    /instagram\.com\/p\/([^/?]+)/,
    /instagram\.com\/reel\/([^/?]+)/,
    /instagram\.com\/tv\/([^/?]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Detect all social media URLs in text
 */
export function detectSocialEmbeds(text: string): SocialEmbed[] {
  const embeds: SocialEmbed[] = [];
  
  // Match all URLs
  const urlPattern = /https?:\/\/[^\s]+/g;
  const urls = text.match(urlPattern) || [];

  for (const url of urls) {
    // Check Twitter/X
    const twitterId = extractTwitterId(url);
    if (twitterId) {
      embeds.push({ platform: 'twitter', url, id: twitterId });
      continue;
    }

    // Check LinkedIn
    const linkedinId = extractLinkedInId(url);
    if (linkedinId) {
      const username = extractLinkedInUsername(url);
      embeds.push({ platform: 'linkedin', url, id: linkedinId, username });
      continue;
    }

    // Check Instagram
    const instagramId = extractInstagramId(url);
    if (instagramId) {
      embeds.push({ platform: 'instagram', url, id: instagramId });
      continue;
    }
  }

  return embeds;
}

/**
 * Get embed URL for Twitter/X
 */
export function getTwitterEmbedUrl(tweetId: string): string {
  return `https://platform.twitter.com/embed/Tweet.html?id=${tweetId}&theme=dark&dnt=true`;
}

/**
 * Get embed URL for LinkedIn
 */
export function getLinkedInEmbedUrl(postId: string): string {
  // LinkedIn embed format - try to use the post ID directly
  return `https://www.linkedin.com/embed/feed/update/urn:li:share:${postId}`;
}

/**
 * Get embed URL for Instagram
 */
export function getInstagramEmbedUrl(postId: string): string {
  return `https://www.instagram.com/p/${postId}/embed/`;
}

/**
 * Check if text contains any social media URLs
 */
export function containsSocialMediaUrl(text: string): boolean {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/(?:\w+\/)?status\/\d+/,
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:posts|feed\/update)/,
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel|tv)\//,
  ];

  return patterns.some(pattern => pattern.test(text));
}

/**
 * Remove social media URLs from text
 */
export function removeSocialMediaUrls(text: string): string {
  return text
    .replace(/https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[^\s]+/g, '')
    .replace(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s]+/g, '')
    .replace(/https?:\/\/(?:www\.)?instagram\.com\/[^\s]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
