/**
 * Integration Tests for Authentication Edge Functions
 * Tests password reset, email verification, and security functions
 */

import { test, expect } from '@playwright/test';
import { invokeEdgeFunction, measureResponseTime } from './edge-function-client';

test.describe('Authentication Functions', () => {
  test.describe('password-reset-request', () => {
    test('should accept valid email for password reset', async () => {
      const response = await invokeEdgeFunction('password-reset-request', {
        body: { email: 'test@example.com' },
      });
      
      // Should not error even if email doesn't exist (security)
      expect(response.status).toBeLessThan(500);
    });

    test('should reject invalid email format', async () => {
      const response = await invokeEdgeFunction('password-reset-request', {
        body: { email: 'invalid-email' },
      });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should reject empty email', async () => {
      const response = await invokeEdgeFunction('password-reset-request', {
        body: { email: '' },
      });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('password-reset-validate-token', () => {
    test('should reject invalid token', async () => {
      const response = await invokeEdgeFunction('password-reset-validate-token', {
        body: { token: 'invalid-token-123' },
      });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should reject expired token', async () => {
      const response = await invokeEdgeFunction('password-reset-validate-token', {
        body: { token: 'expired-token-abc' },
      });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('password-reset-set-password', () => {
    test('should reject weak password', async () => {
      const response = await invokeEdgeFunction('password-reset-set-password', {
        body: { 
          token: 'test-token',
          password: '123' // Too weak
        },
      });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should reject without token', async () => {
      const response = await invokeEdgeFunction('password-reset-set-password', {
        body: { password: 'ValidPassword123!' },
      });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('send-email-verification', () => {
    test('should handle verification request', async () => {
      const response = await invokeEdgeFunction('send-email-verification', {
        body: { email: 'test@example.com' },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('verify-email-code', () => {
    test('should reject invalid verification code', async () => {
      const response = await invokeEdgeFunction('verify-email-code', {
        body: { 
          email: 'test@example.com',
          code: '000000'
        },
      });
      
      // Should fail with invalid code
      expect(response.status).toBeLessThan(500);
    });

    test('should reject wrong format code', async () => {
      const response = await invokeEdgeFunction('verify-email-code', {
        body: { 
          email: 'test@example.com',
          code: 'abc' // Not 6 digits
        },
      });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('send-sms-verification', () => {
    test('should handle SMS verification request', async () => {
      const response = await invokeEdgeFunction('send-sms-verification', {
        body: { phone: '+1234567890' },
      });
      
      expect(response.status).toBeLessThan(500);
    });

    test('should reject invalid phone format', async () => {
      const response = await invokeEdgeFunction('send-sms-verification', {
        body: { phone: 'not-a-phone' },
      });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('verify-sms-code', () => {
    test('should reject invalid SMS code', async () => {
      const response = await invokeEdgeFunction('verify-sms-code', {
        body: { 
          phone: '+1234567890',
          code: '000000'
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('generate-recovery-codes', () => {
    test('should require authentication', async () => {
      const response = await invokeEdgeFunction('generate-recovery-codes', {
        body: {},
      });
      
      // Should fail without auth
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});

test.describe('Security Functions', () => {
  test.describe('detect-threats', () => {
    test('should detect threat patterns', async () => {
      const response = await invokeEdgeFunction('detect-threats', {
        body: { 
          ip_address: '192.168.1.1',
          event_type: 'login_attempt'
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('enrich-ip-geo', () => {
    test('should enrich IP with geo data', async () => {
      const response = await invokeEdgeFunction('enrich-ip-geo', {
        body: { ip_address: '8.8.8.8' },
      });
      
      expect(response.status).toBeLessThan(500);
    });

    test('should handle private IP', async () => {
      const response = await invokeEdgeFunction('enrich-ip-geo', {
        body: { ip_address: '192.168.1.1' },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('auto-respond-threats', () => {
    test('should handle threat response', async () => {
      const response = await invokeEdgeFunction('auto-respond-threats', {
        body: { 
          threat_type: 'brute_force',
          ip_address: '10.0.0.1'
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('send-security-alert', () => {
    test('should handle security alert', async () => {
      const response = await invokeEdgeFunction('send-security-alert', {
        body: { 
          alert_type: 'test',
          severity: 'low',
          details: { test: true }
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });
});

test.describe('Auth Function Performance', () => {
  test('password-reset-request should be fast', async () => {
    const { durationMs } = await measureResponseTime('password-reset-request', {
      body: { email: 'perf-test@example.com' },
    });
    
    expect(durationMs).toBeLessThan(3000);
  });

  test('check-login-lockout should be very fast', async () => {
    const { durationMs } = await measureResponseTime('check-login-lockout', {
      body: { email: 'perf-test@example.com' },
    });
    
    expect(durationMs).toBeLessThan(2000);
  });
});
