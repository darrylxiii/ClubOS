/**
 * Generate a cryptographically secure 64-character hex token
 */
export const generateSecureToken = (): string => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * Generate a secure 6-digit OTP code (100000-999999)
 */
export const generateOTP = (): string => {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const num = (array[0] % 900000) + 100000;
  return num.toString();
};

/**
 * Common password patterns that should be rejected even if they meet
 * character-class requirements. Checked client-side for instant feedback
 * and server-side for enforcement.
 */
const COMMON_PATTERNS = [
  /^[A-Z][a-z]+\d{2,4}[!@#$%^&*]$/,    // "Password123!"
  /^(password|welcome|admin|quantum|letmein|changeme|abc123|qwerty)/i,
  /(.)\1{3,}/,                            // 4+ repeated chars
  /^(abc|123|qwerty|asdf)/i,
  /^[A-Z][a-z]+(19|20)\d{2}[!@#$%^&*]$/, // "Company2024!"
];

/**
 * Check if password matches common weak patterns
 */
export const hasCommonPattern = (password: string): boolean => {
  return COMMON_PATTERNS.some(p => p.test(password));
};

/**
 * Validate password strength and requirements
 */
export const validatePasswordStrength = (password: string) => {
  const requirements = {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const metCount = Object.values(requirements).filter(Boolean).length;
  
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (metCount >= 4) strength = 'strong';
  else if (metCount >= 3) strength = 'medium';

  return {
    valid: requirements.minLength && metCount >= 3,
    strength,
    requirements,
    missing: Object.keys(requirements).filter(
      (key) => !requirements[key as keyof typeof requirements]
    ),
  };
};
