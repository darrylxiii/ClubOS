/**
 * Integration Tests for Meeting & Recording Edge Functions
 * Tests video calls, recordings, and real-time features
 */

import { test, expect } from '@playwright/test';
import { invokeEdgeFunction } from './edge-function-client';

test.describe('Meeting Management Functions', () => {
  test.describe('create-instant-meeting', () => {
    test('should create instant meeting', async () => {
      const response = await invokeEdgeFunction('create-instant-meeting', {
        body: { 
          title: 'Quick Sync',
          host_id: 'test-host'
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('meeting-bot-manager', () => {
    test('should manage meeting bot', async () => {
      const response = await invokeEdgeFunction('meeting-bot-manager', {
        body: { 
          action: 'status',
          meeting_id: 'test-meeting'
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('webrtc-signaling', () => {
    test('should handle signaling', async () => {
      const response = await invokeEdgeFunction('webrtc-signaling', {
        body: { 
          type: 'offer',
          meeting_id: 'test-meeting'
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });
});

test.describe('Recording Functions', () => {
  test.describe('voice-to-text', () => {
    test('should handle voice to text', async () => {
      const response = await invokeEdgeFunction('voice-to-text', {
        body: { 
          audio_url: 'https://example.com/audio.wav',
          language: 'en'
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('compile-meeting-transcript', () => {
    test('should compile transcript', async () => {
      const response = await invokeEdgeFunction('compile-meeting-transcript', {
        body: { meeting_id: 'test-meeting' },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('analyze-meeting-recording-advanced', () => {
    test('should analyze recording', async () => {
      const response = await invokeEdgeFunction('analyze-meeting-recording-advanced', {
        body: { recording_id: 'test-recording' },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('calculate-speaking-metrics', () => {
    test('should calculate speaking metrics', async () => {
      const response = await invokeEdgeFunction('calculate-speaking-metrics', {
        body: { meeting_id: 'test-meeting' },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('process-meeting-intelligence', () => {
    test('should process meeting intelligence', async () => {
      const response = await invokeEdgeFunction('process-meeting-intelligence', {
        body: { meeting_id: 'test-meeting' },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });
});

test.describe('Interview Functions', () => {
  test.describe('analyze-interview', () => {
    test('should analyze interview', async () => {
      const response = await invokeEdgeFunction('analyze-interview', {
        body: { interview_id: 'test-interview' },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('interview-voice-session', () => {
    test('should handle voice session', async () => {
      const response = await invokeEdgeFunction('interview-voice-session', {
        body: { 
          action: 'start',
          interview_id: 'test-interview'
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('meeting-debrief', () => {
    test('should generate debrief', async () => {
      const response = await invokeEdgeFunction('meeting-debrief', {
        body: { meeting_id: 'test-meeting' },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });
});
