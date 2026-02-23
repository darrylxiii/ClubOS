/**
 * OTP Hashing Utility
 * Hashes OTP codes using SHA-256 before database storage.
 * Never store plaintext OTP codes.
 */

export async function hashOTP(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyOTPHash(code: string, storedHash: string): Promise<boolean> {
  const inputHash = await hashOTP(code);
  return inputHash === storedHash;
}
