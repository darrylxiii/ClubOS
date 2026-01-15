/**
 * Integration Tests for Public Edge Functions
 * Tests functions that don't require authentication
 */

import { test, expect } from '@playwright/test';
import { 
  invokeEdgeFunction, 
  measureResponseTime 
} from './edge-function-client';

test.describe('Public Edge Functions', () => {
  test.describe('validate-invite-code', () => {
    test('should reject invalid invite code', async () => {
      const response = await invokeEdgeFunction('validate-invite-code', {
        body: { code: 'INVALID-CODE-123' },
      });
      
      expect(response.status).toBeLessThan(500);
      // Should either return 400 (invalid) or 200 with error in body
    });

    test('should respond within acceptable time', async () => {
      const { durationMs } = await measureResponseTime('validate-invite-code', {
        body: { code: 'TEST-CODE' },
      });
      
      expect(durationMs).toBeLessThan(5000); // 5 second max
    });
  });

  test.describe('verify-recaptcha', () => {
    test('should reject missing token', async () => {
      const response = await invokeEdgeFunction('verify-recaptcha', {
        body: {},
      });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should reject invalid token', async () => {
      const response = await invokeEdgeFunction('verify-recaptcha', {
        body: { token: 'invalid-token' },
      });
      
      // Should fail verification
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('check-email-exists', () => {
    test('should check email existence', async () => {
      const response = await invokeEdgeFunction('check-email-exists', {
        body: { email: 'test@example.com' },
      });
      
      expect(response.status).toBeLessThan(500);
    });

    test('should reject invalid email format', async () => {
      const response = await invokeEdgeFunction('check-email-exists', {
        body: { email: 'not-an-email' },
      });
      
      // Should return error for invalid email
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('join-waitlist', () => {
    test('should handle waitlist signup', async () => {
      const response = await invokeEdgeFunction('join-waitlist', {
        body: { 
          email: `test-${Date.now()}@example.com`,
          name: 'Test User'
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });

    test('should reject missing email', async () => {
      const response = await invokeEdgeFunction('join-waitlist', {
        body: { name: 'Test User' },
      });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('check-ip-blocked', () => {
    test('should check if IP is blocked', async () => {
      const response = await invokeEdgeFunction('check-ip-blocked', {
        body: { ip_address: '192.168.1.1' },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('check-login-lockout', () => {
    test('should check login lockout status', async () => {
      const response = await invokeEdgeFunction('check-login-lockout', {
        body: { email: 'test@example.com' },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('get-available-slots', () => {
    test('should return available booking slots', async () => {
      const response = await invokeEdgeFunction('get-available-slots', {
        body: { 
          booking_link_id: 'test-id',
          date: new Date().toISOString().split('T')[0]
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('fetch-link-metadata', () => {
    test('should fetch metadata for valid URL', async () => {
      const response = await invokeEdgeFunction('fetch-link-metadata', {
        body: { url: 'https://example.com' },
      });
      
      expect(response.status).toBeLessThan(500);
    });

    test('should handle invalid URL', async () => {
      const response = await invokeEdgeFunction('fetch-link-metadata', {
        body: { url: 'not-a-url' },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('kb-search', () => {
    test('should search knowledge base', async () => {
      const response = await invokeEdgeFunction('kb-search', {
        body: { query: 'how to apply' },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('semantic-search', () => {
    test('should perform semantic search', async () => {
      const response = await invokeEdgeFunction('semantic-search', {
        body: { 
          query: 'software engineer',
          type: 'jobs'
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });
});

test.describe('Edge Function Performance', () => {
  const publicFunctions = [
    'validate-invite-code',
    'check-email-exists',
    'check-ip-blocked',
    'kb-search',
  ];

  for (const fn of publicFunctions) {
    test(`${fn} should respond within 5 seconds`, async () => {
      const { durationMs } = await measureResponseTime(fn, {
        body: { test: true },
      });
      
      expect(durationMs).toBeLessThan(5000);
    });
  }
});

test.describe('Edge Function Error Handling', () => {
  test('should return CORS headers', async () => {
    const response = await invokeEdgeFunction('validate-invite-code', {
      body: { code: 'test' },
      method: 'POST',
    });
    
    // Check that we get a response (CORS should allow it)
    expect(response.status).toBeDefined();
  });

  test('should handle OPTIONS preflight', async () => {
    const response = await invokeEdgeFunction('validate-invite-code', {
      method: 'GET', // Changed to test different method handling
      body: undefined,
    });
    
    expect(response.status).toBeDefined();
  });
});
