import { supabase } from '@/integrations/supabase/client';

/**
 * Extract the storage path from a full Supabase storage URL or return as-is if already a path.
 * Handles both legacy full URLs and new path-only values.
 */
export function extractStoragePath(pathOrUrl: string, bucket: string = 'resumes'): string {
  if (!pathOrUrl) return '';

  // Already a relative path (no http prefix)
  if (!pathOrUrl.startsWith('http')) {
    return pathOrUrl;
  }

  // Try to extract path from full URL
  const pattern = new RegExp(`/storage/v1/object/(?:public|sign)/${bucket}/(.+?)(?:\\?|$)`);
  const match = pathOrUrl.match(pattern);
  if (match) return decodeURIComponent(match[1]);

  // Fallback: try splitting on bucket name
  const parts = pathOrUrl.split(`/${bucket}/`);
  if (parts.length > 1) {
    return decodeURIComponent(parts[1].split('?')[0]);
  }

  // Last resort: return as-is
  return pathOrUrl;
}

/**
 * Generate a signed URL for a file in a private bucket.
 * Accepts either a full URL (legacy) or a relative storage path.
 * Returns a 1-hour signed URL.
 */
export async function getSignedStorageUrl(
  pathOrUrl: string,
  bucket: string = 'resumes',
  expiresIn: number = 3600
): Promise<string | null> {
  if (!pathOrUrl) return null;

  const path = extractStoragePath(pathOrUrl, bucket);
  if (!path) return null;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.error('[storageUtils] Failed to create signed URL:', error);
    return null;
  }

  return data?.signedUrl || null;
}
