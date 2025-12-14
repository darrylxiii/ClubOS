/**
 * Integration Tests for Notification Edge Functions
 * Tests email, SMS, and push notification functions
 */

import { test, expect } from '@playwright/test';
import { invokeEdgeFunction } from './edge-function-client';

test.describe('Email Notification Functions', () => {
  test.describe('send-notification-email', () => {
    test('should require recipient', async () => {
      const response = await invokeEdgeFunction('send-notification-email', {
        body: { 
          subject: 'Test',
          template: 'default'
        },
      });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('send-candidate-invitation', () => {
    test('should require email', async () => {
      const response = await invokeEdgeFunction('send-candidate-invitation', {
        body: { name: 'Test Candidate' },
      });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should handle invitation request', async () => {
      const response = await invokeEdgeFunction('send-candidate-invitation', {
        body: { 
          email: 'test@example.com',
          name: 'Test Candidate'
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('send-referral-invite', () => {
    test('should send referral invite', async () => {
      const response = await invokeEdgeFunction('send-referral-invite', {
        body: { 
          email: 'referral@example.com',
          referrer_id: 'test-referrer'
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('send-password-reset-email', () => {
    test('should send password reset', async () => {
      const response = await invokeEdgeFunction('send-password-reset-email', {
        body: { email: 'test@example.com' },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('send-password-changed-email', () => {
    test('should send password changed notification', async () => {
      const response = await invokeEdgeFunction('send-password-changed-email', {
        body: { user_id: 'test-user' },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('send-feedback-response', () => {
    test('should send feedback response', async () => {
      const response = await invokeEdgeFunction('send-feedback-response', {
        body: { 
          feedback_id: 'test-feedback',
          response: 'Thank you for your feedback!'
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('send-note-mention-notification', () => {
    test('should send mention notification', async () => {
      const response = await invokeEdgeFunction('send-note-mention-notification', {
        body: { 
          note_id: 'test-note',
          mentioned_user_id: 'test-user'
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });
});

test.describe('Meeting Notification Functions', () => {
  test.describe('send-meeting-invitation-email', () => {
    test('should require meeting ID', async () => {
      const response = await invokeEdgeFunction('send-meeting-invitation-email', {
        body: { attendee_email: 'test@example.com' },
      });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('send-meeting-summary-email', () => {
    test('should require meeting ID', async () => {
      const response = await invokeEdgeFunction('send-meeting-summary-email', {
        body: {},
      });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});

test.describe('Approval Notification Functions', () => {
  test.describe('send-approval-notification', () => {
    test('should send approval notification', async () => {
      const response = await invokeEdgeFunction('send-approval-notification', {
        body: { 
          request_id: 'test-request',
          type: 'member_approval'
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('send-approval-sms', () => {
    test('should require phone number', async () => {
      const response = await invokeEdgeFunction('send-approval-sms', {
        body: { request_id: 'test-request' },
      });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});

test.describe('Push Notification Functions', () => {
  test.describe('send-push-notification', () => {
    test('should require user ID', async () => {
      const response = await invokeEdgeFunction('send-push-notification', {
        body: { 
          title: 'Test',
          body: 'Test notification'
        },
      });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should send push notification', async () => {
      const response = await invokeEdgeFunction('send-push-notification', {
        body: { 
          user_id: 'test-user',
          title: 'Test',
          body: 'Test notification'
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });
});

test.describe('Support Functions', () => {
  test.describe('create-support-ticket', () => {
    test('should create support ticket', async () => {
      const response = await invokeEdgeFunction('create-support-ticket', {
        body: { 
          subject: 'Test Issue',
          description: 'This is a test ticket',
          priority: 'low'
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });

    test('should require subject', async () => {
      const response = await invokeEdgeFunction('create-support-ticket', {
        body: { description: 'Test' },
      });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});
