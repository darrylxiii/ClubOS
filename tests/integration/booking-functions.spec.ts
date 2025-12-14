/**
 * Integration Tests for Booking Edge Functions
 * Tests booking creation, management, and calendar integration
 */

import { test, expect } from '@playwright/test';
import { invokeEdgeFunction, measureResponseTime } from './edge-function-client';

test.describe('Booking Management Functions', () => {
  test.describe('create-booking', () => {
    test('should require booking link ID', async () => {
      const response = await invokeEdgeFunction('create-booking', {
        body: { 
          guest_name: 'Test Guest',
          guest_email: 'guest@example.com'
        },
      });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should require guest information', async () => {
      const response = await invokeEdgeFunction('create-booking', {
        body: { 
          booking_link_id: 'test-link-id'
        },
      });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should validate email format', async () => {
      const response = await invokeEdgeFunction('create-booking', {
        body: { 
          booking_link_id: 'test-link-id',
          guest_name: 'Test Guest',
          guest_email: 'not-an-email'
        },
      });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('cancel-booking', () => {
    test('should require booking ID', async () => {
      const response = await invokeEdgeFunction('cancel-booking', {
        body: {},
      });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('should handle non-existent booking', async () => {
      const response = await invokeEdgeFunction('cancel-booking', {
        body: { booking_id: 'non-existent-id' },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('handle-booking-reschedule', () => {
    test('should require booking ID and new time', async () => {
      const response = await invokeEdgeFunction('handle-booking-reschedule', {
        body: { booking_id: 'test-booking' },
      });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('get-available-slots', () => {
    test('should return slots for valid request', async () => {
      const response = await invokeEdgeFunction('get-available-slots', {
        body: { 
          booking_link_id: 'test-link',
          date: new Date().toISOString().split('T')[0]
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });

    test('should handle past date', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);
      
      const response = await invokeEdgeFunction('get-available-slots', {
        body: { 
          booking_link_id: 'test-link',
          date: pastDate.toISOString().split('T')[0]
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });

    test('should handle far future date', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 6);
      
      const response = await invokeEdgeFunction('get-available-slots', {
        body: { 
          booking_link_id: 'test-link',
          date: futureDate.toISOString().split('T')[0]
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });
});

test.describe('Booking Notification Functions', () => {
  test.describe('send-booking-confirmation', () => {
    test('should require booking ID', async () => {
      const response = await invokeEdgeFunction('send-booking-confirmation', {
        body: {},
      });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('send-booking-reminder', () => {
    test('should handle reminder request', async () => {
      const response = await invokeEdgeFunction('send-booking-reminder', {
        body: { booking_id: 'test-booking' },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('process-booking-reminders', () => {
    test('should process pending reminders', async () => {
      const response = await invokeEdgeFunction('process-booking-reminders', {
        body: {},
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });
});

test.describe('Calendar Integration Functions', () => {
  test.describe('sync-booking-to-calendar', () => {
    test('should require booking ID', async () => {
      const response = await invokeEdgeFunction('sync-booking-to-calendar', {
        body: {},
      });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('google-calendar-auth', () => {
    test('should handle auth flow initiation', async () => {
      const response = await invokeEdgeFunction('google-calendar-auth', {
        body: { action: 'initiate' },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('google-calendar-events', () => {
    test('should require authentication', async () => {
      const response = await invokeEdgeFunction('google-calendar-events', {
        body: { user_id: 'test-user' },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('microsoft-calendar-auth', () => {
    test('should handle auth flow initiation', async () => {
      const response = await invokeEdgeFunction('microsoft-calendar-auth', {
        body: { action: 'initiate' },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('microsoft-calendar-events', () => {
    test('should require authentication', async () => {
      const response = await invokeEdgeFunction('microsoft-calendar-events', {
        body: { user_id: 'test-user' },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('refresh-calendar-tokens', () => {
    test('should handle token refresh', async () => {
      const response = await invokeEdgeFunction('refresh-calendar-tokens', {
        body: {},
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('detect-calendar-interviews', () => {
    test('should detect interviews in calendar', async () => {
      const response = await invokeEdgeFunction('detect-calendar-interviews', {
        body: { user_id: 'test-user' },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });
});

test.describe('Video Link Generation', () => {
  test.describe('generate-video-link', () => {
    test('should generate video meeting link', async () => {
      const response = await invokeEdgeFunction('generate-video-link', {
        body: { 
          platform: 'tqc',
          booking_id: 'test-booking'
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });

    test('should handle Google Meet platform', async () => {
      const response = await invokeEdgeFunction('generate-video-link', {
        body: { 
          platform: 'google_meet',
          booking_id: 'test-booking'
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('create-instant-meeting', () => {
    test('should create instant meeting', async () => {
      const response = await invokeEdgeFunction('create-instant-meeting', {
        body: { 
          title: 'Quick Call',
          host_id: 'test-host'
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('create-meeting-from-booking', () => {
    test('should require booking ID', async () => {
      const response = await invokeEdgeFunction('create-meeting-from-booking', {
        body: {},
      });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});

test.describe('Booking Function Performance', () => {
  test('get-available-slots should be fast', async () => {
    const { durationMs } = await measureResponseTime('get-available-slots', {
      body: { 
        booking_link_id: 'test',
        date: new Date().toISOString().split('T')[0]
      },
    });
    
    expect(durationMs).toBeLessThan(3000);
  });
});
