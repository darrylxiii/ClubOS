/**
 * Utility functions for detecting and parsing Spotify URLs
 */

export type SpotifyType = 'track' | 'album' | 'playlist' | 'episode' | 'show';

export interface SpotifyEmbed {
  type: SpotifyType;
  url: string;
  id: string;
}

/**
 * Extract Spotify ID and type from URL
 */
export function extractSpotifyInfo(url: string): SpotifyEmbed | null {
  const patterns = [
    { regex: /spotify\.com\/track\/([a-zA-Z0-9]+)/, type: 'track' as SpotifyType },
    { regex: /spotify\.com\/album\/([a-zA-Z0-9]+)/, type: 'album' as SpotifyType },
    { regex: /spotify\.com\/playlist\/([a-zA-Z0-9]+)/, type: 'playlist' as SpotifyType },
    { regex: /spotify\.com\/episode\/([a-zA-Z0-9]+)/, type: 'episode' as SpotifyType },
    { regex: /spotify\.com\/show\/([a-zA-Z0-9]+)/, type: 'show' as SpotifyType },
  ];

  for (const { regex, type } of patterns) {
    const match = url.match(regex);
    if (match && match[1]) {
      return { type, url, id: match[1] };
    }
  }

  return null;
}

/**
 * Get Spotify embed URL
 */
export function getSpotifyEmbedUrl(type: SpotifyType, id: string): string {
  return `https://open.spotify.com/embed/${type}/${id}?theme=0`;
}

/**
 * Check if text contains Spotify URL
 */
export function containsSpotifyUrl(text: string): boolean {
  return /(?:https?:\/\/)?(?:open\.)?spotify\.com\/(track|album|playlist|episode|show)\/[a-zA-Z0-9]+/.test(text);
}

/**
 * Detect all Spotify URLs in text
 */
export function detectSpotifyEmbeds(text: string): SpotifyEmbed[] {
  const embeds: SpotifyEmbed[] = [];
  const urlPattern = /https?:\/\/[^\s]+/g;
  const urls = text.match(urlPattern) || [];

  for (const url of urls) {
    const spotifyInfo = extractSpotifyInfo(url);
    if (spotifyInfo) {
      embeds.push(spotifyInfo);
    }
  }

  return embeds;
}

/**
 * Remove Spotify URLs from text
 */
export function removeSpotifyUrls(text: string): string {
  return text
    .replace(/https?:\/\/(?:open\.)?spotify\.com\/[^\s]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
