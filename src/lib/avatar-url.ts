/**
 * Append a cache-busting query parameter to an avatar URL
 * so the browser doesn't serve a stale (or failed) cached version.
 */
export function versionedAvatarUrl(
  url: string | null | undefined,
  lastSyncedAt: string | null | undefined,
): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    if (lastSyncedAt) {
      u.searchParams.set('v', String(new Date(lastSyncedAt).getTime()));
    }
    return u.toString();
  } catch {
    // Not a valid URL — return as-is
    return url;
  }
}
