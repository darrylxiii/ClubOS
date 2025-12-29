import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  generateSecureToken, 
  generateOTP, 
  validatePasswordStrength 
} from '../passwordReset';

// Mock crypto.getRandomValues
beforeEach(() => {
  vi.spyOn(crypto, 'getRandomValues').mockImplementation((array: ArrayBufferView | null) => {
    if (array instanceof Uint8Array) {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    } else if (array instanceof Uint32Array) {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 4294967296);
      }
    }
    return array as any;
  });
});

describe('passwordReset utilities', () => {
  describe('generateSecureToken', () => {
    it('should generate a 64-character hex token', () => {
      const token = generateSecureToken();
      
      expect(token).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(token)).toBe(true);
    });

    it('should generate unique tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      
      expect(token1).not.toBe(token2);
    });

    it('should only contain lowercase hex characters', () => {
      const token = generateSecureToken();
      
      expect(token).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('generateOTP', () => {
    it('should generate a 6-digit OTP', () => {
      const otp = generateOTP();
      
      expect(otp).toHaveLength(6);
      expect(/^\d{6}$/.test(otp)).toBe(true);
    });

    it('should generate OTP in valid range (100000-999999)', () => {
      for (let i = 0; i < 100; i++) {
        const otp = generateOTP();
        const numOtp = parseInt(otp, 10);
        
        expect(numOtp).toBeGreaterThanOrEqual(100000);
        expect(numOtp).toBeLessThanOrEqual(999999);
      }
    });

    it('should generate different OTPs', () => {
      const otps = new Set<string>();
      for (let i = 0; i < 10; i++) {
        otps.add(generateOTP());
      }
      // With random generation, we expect most to be unique
      expect(otps.size).toBeGreaterThan(1);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should reject password shorter than 12 characters', () => {
      const result = validatePasswordStrength('Short1!');
      
      expect(result.valid).toBe(false);
      expect(result.requirements.minLength).toBe(false);
      expect(result.missing).toContain('minLength');
    });

    it('should require uppercase letters', () => {
      const result = validatePasswordStrength('lowercaseonly123!');
      
      expect(result.requirements.uppercase).toBe(false);
      expect(result.missing).toContain('uppercase');
    });

    it('should require lowercase letters', () => {
      const result = validatePasswordStrength('UPPERCASEONLY123!');
      
      expect(result.requirements.lowercase).toBe(false);
      expect(result.missing).toContain('lowercase');
    });

    it('should require numbers', () => {
      const result = validatePasswordStrength('NoNumbersHere!@');
      
      expect(result.requirements.number).toBe(false);
      expect(result.missing).toContain('number');
    });

    it('should require special characters', () => {
      const result = validatePasswordStrength('NoSpecialChars123');
      
      expect(result.requirements.special).toBe(false);
      expect(result.missing).toContain('special');
    });

    it('should validate a strong password', () => {
      const result = validatePasswordStrength('StrongPass123!@#');
      
      expect(result.valid).toBe(true);
      expect(result.strength).toBe('strong');
      expect(result.missing).toHaveLength(0);
    });

    it('should classify medium strength passwords', () => {
      const result = validatePasswordStrength('mediumpassword123');
      
      expect(result.valid).toBe(false);
      expect(result.strength).toBe('medium');
    });

    it('should classify weak passwords', () => {
      const result = validatePasswordStrength('weak');
      
      expect(result.valid).toBe(false);
      expect(result.strength).toBe('weak');
    });

    it('should return all requirements met for strong password', () => {
      const result = validatePasswordStrength('MySecure@Pass123');
      
      expect(result.requirements.minLength).toBe(true);
      expect(result.requirements.uppercase).toBe(true);
      expect(result.requirements.lowercase).toBe(true);
      expect(result.requirements.number).toBe(true);
      expect(result.requirements.special).toBe(true);
    });

    it('should handle empty password', () => {
      const result = validatePasswordStrength('');
      
      expect(result.valid).toBe(false);
      expect(result.strength).toBe('weak');
    });

    it('should treat various special characters as valid', () => {
      const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '-', '_', '+', '='];
      
      for (const char of specialChars) {
        const password = `SecurePass123${char}`;
        const result = validatePasswordStrength(password);
        expect(result.requirements.special).toBe(true);
      }
    });
  });
});
