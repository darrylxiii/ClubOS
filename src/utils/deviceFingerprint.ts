/**
 * Generate a lightweight device fingerprint for rate limiting.
 * This is NOT a tracking fingerprint — it's a hash of stable browser attributes
 * used solely to prevent automated password reset abuse across IP rotations.
 */
export async function getDeviceFingerprint(): Promise<string> {
  const components = [
    navigator.language || '',
    String(screen.width),
    String(screen.height),
    String(screen.colorDepth),
    Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    navigator.platform || '',
    String(navigator.hardwareConcurrency || ''),
  ];

  const raw = components.join('|');
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
