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
 * Validate password strength and requirements
 */
export const validatePasswordStrength = (password: string) => {
  const requirements = {
    minLength: password.length >= 12,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const metCount = Object.values(requirements).filter(Boolean).length;
  
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (metCount === 5) strength = 'strong';
  else if (metCount >= 3) strength = 'medium';

  return {
    valid: metCount === 5,
    strength,
    requirements,
    missing: Object.keys(requirements).filter(
      (key) => !requirements[key as keyof typeof requirements]
    ),
  };
};
