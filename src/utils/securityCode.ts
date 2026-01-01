/**
 * Security Code Generation for E2EE Verification
 * Generates human-readable security codes from encryption key fingerprints
 * Similar to Signal/WhatsApp verification
 */

// Emoji set for visual verification (subset of common, universal emojis)
const VERIFICATION_EMOJIS = [
  '🔒', '🛡️', '✅', '🔐', '🌟', '💎', '🎯', '🚀',
  '🌈', '🔥', '💫', '⭐', '🎨', '🎭', '🎪', '🎠',
  '🌸', '🌺', '🌻', '🌷', '🍀', '🌿', '🌴', '🌵',
  '🦋', '🐬', '🦅', '🦁', '🐺', '🦊', '🐻', '🐼',
];

/**
 * Generate a fingerprint from raw key material
 */
export async function generateKeyFingerprint(keyMaterial: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyMaterial);
  const hashArray = new Uint8Array(hashBuffer);
  
  // Convert to hex string
  return Array.from(hashArray)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate a human-readable security code from key fingerprint
 * Format: 5 groups of 5 digits (e.g., "12345 67890 12345 67890 12345")
 */
export function fingerprintToSecurityCode(fingerprint: string): string {
  // Use first 25 chars of fingerprint (100 bits)
  const chars = fingerprint.slice(0, 25);
  
  // Convert hex chars to decimal digits
  const digits: number[] = [];
  for (let i = 0; i < chars.length; i++) {
    const num = parseInt(chars[i], 16);
    digits.push(num % 10);
  }
  
  // Group into 5 groups of 5 digits
  const groups: string[] = [];
  for (let i = 0; i < 5; i++) {
    const group = digits.slice(i * 5, (i + 1) * 5).join('');
    groups.push(group);
  }
  
  return groups.join(' ');
}

/**
 * Generate emoji representation of security code for visual verification
 * Returns 8 emojis that both parties should see if E2EE is working
 */
export function fingerprintToEmojis(fingerprint: string): string[] {
  const emojis: string[] = [];
  const bytes = hexToBytes(fingerprint.slice(0, 16));
  
  for (let i = 0; i < 8; i++) {
    const index = bytes[i] % VERIFICATION_EMOJIS.length;
    emojis.push(VERIFICATION_EMOJIS[index]);
  }
  
  return emojis;
}

/**
 * Generate combined security code (fingerprint + peer fingerprint)
 * Both parties should see the same code if connected securely
 */
export async function generateSecurityCode(
  localKeyMaterial: ArrayBuffer,
  remoteKeyMaterial: ArrayBuffer
): Promise<{
  code: string;
  emojis: string[];
  fingerprint: string;
}> {
  // Combine both key materials in sorted order for consistency
  const localBytes = new Uint8Array(localKeyMaterial);
  const remoteBytes = new Uint8Array(remoteKeyMaterial);
  
  // Create combined buffer (XOR for order independence)
  const combinedLength = Math.max(localBytes.length, remoteBytes.length);
  const combined = new Uint8Array(combinedLength);
  
  for (let i = 0; i < combinedLength; i++) {
    const localByte = localBytes[i % localBytes.length] || 0;
    const remoteByte = remoteBytes[i % remoteBytes.length] || 0;
    combined[i] = localByte ^ remoteByte;
  }
  
  // Generate fingerprint from combined material
  const fingerprint = await generateKeyFingerprint(combined.buffer);
  const code = fingerprintToSecurityCode(fingerprint);
  const emojis = fingerprintToEmojis(fingerprint);
  
  return { code, emojis, fingerprint };
}

/**
 * Simple security code for single key (used when shared key is available)
 */
export async function generateSimpleSecurityCode(sharedKey: CryptoKey): Promise<{
  code: string;
  emojis: string[];
  fingerprint: string;
}> {
  const exportedKey = await crypto.subtle.exportKey('raw', sharedKey);
  const fingerprint = await generateKeyFingerprint(exportedKey);
  const code = fingerprintToSecurityCode(fingerprint);
  const emojis = fingerprintToEmojis(fingerprint);
  
  return { code, emojis, fingerprint };
}

// Helper: convert hex string to bytes
function hexToBytes(hex: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substr(i, 2), 16));
  }
  return bytes;
}

/**
 * Verify that two security codes match
 */
export function verifySecurityCodes(code1: string, code2: string): boolean {
  // Normalize codes (remove spaces, lowercase)
  const normalized1 = code1.replace(/\s/g, '').toLowerCase();
  const normalized2 = code2.replace(/\s/g, '').toLowerCase();
  return normalized1 === normalized2;
}
