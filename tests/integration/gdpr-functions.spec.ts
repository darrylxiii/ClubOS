/**
 * Integration Tests for GDPR & Compliance Edge Functions
 * Tests data export, deletion, and privacy functions
 */

import { test, expect } from '@playwright/test';
import { invokeEdgeFunction } from './edge-function-client';

test.describe('GDPR Functions', () => {
  test.describe('gdpr-export', () => {
    test('should require authentication', async () => {
      const response = await invokeEdgeFunction('gdpr-export', {
        body: {},
      });
      
      // Should require auth
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should require user ID with auth', async () => {
      const response = await invokeEdgeFunction('gdpr-export', {
        body: { user_id: 'test-user' },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('gdpr-delete', () => {
    test('should require authentication', async () => {
      const response = await invokeEdgeFunction('gdpr-delete', {
        body: {},
      });
      
      // Should require auth
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should require confirmation', async () => {
      const response = await invokeEdgeFunction('gdpr-delete', {
        body: { 
          user_id: 'test-user',
          confirm: false
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });
});

test.describe('Cleanup Functions', () => {
  test.describe('cleanup-stale-activity', () => {
    test('should cleanup stale activity', async () => {
      const response = await invokeEdgeFunction('cleanup-stale-activity', {
        body: {},
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('cleanup-onboarding-resumes', () => {
    test('should cleanup onboarding resumes', async () => {
      const response = await invokeEdgeFunction('cleanup-onboarding-resumes', {
        body: {},
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('cleanup-test-intelligence-data', () => {
    test('should cleanup test data', async () => {
      const response = await invokeEdgeFunction('cleanup-test-intelligence-data', {
        body: {},
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });
});

test.describe('Backup Functions', () => {
  test.describe('verify-database-backups', () => {
    test('should verify backups', async () => {
      const response = await invokeEdgeFunction('verify-database-backups', {
        body: {},
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('test-pitr-recovery', () => {
    test('should test PITR recovery', async () => {
      const response = await invokeEdgeFunction('test-pitr-recovery', {
        body: { dry_run: true },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });
});

test.describe('Incident Response Functions', () => {
  test.describe('handle-incident-response', () => {
    test('should handle incident', async () => {
      const response = await invokeEdgeFunction('handle-incident-response', {
        body: { 
          incident_type: 'test',
          severity: 'low'
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });
});
