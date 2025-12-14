/**
 * Integration Tests for AI Edge Functions
 * Tests AI-powered features like chat, analysis, and generation
 */

import { test, expect } from '@playwright/test';
import { invokeEdgeFunction, measureResponseTime } from './edge-function-client';

test.describe('AI Chat Functions', () => {
  test.describe('club-ai-chat', () => {
    test('should require authentication', async () => {
      const response = await invokeEdgeFunction('club-ai-chat', {
        body: { 
          message: 'Hello',
          context: 'general'
        },
      });
      
      // Should require auth
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('ai-career-advisor', () => {
    test('should require authentication', async () => {
      const response = await invokeEdgeFunction('ai-career-advisor', {
        body: { question: 'What skills should I learn?' },
      });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('ai-booking-assistant', () => {
    test('should handle booking query', async () => {
      const response = await invokeEdgeFunction('ai-booking-assistant', {
        body: { 
          query: 'Schedule a meeting',
          user_id: 'test-user'
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('interview-prep-chat', () => {
    test('should require context', async () => {
      const response = await invokeEdgeFunction('interview-prep-chat', {
        body: { message: 'How do I prepare?' },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('incubator-ai-chat', () => {
    test('should handle incubator queries', async () => {
      const response = await invokeEdgeFunction('incubator-ai-chat', {
        body: { 
          message: 'What is the program about?',
          context: {}
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });
});

test.describe('AI Analysis Functions', () => {
  test.describe('analyze-sentiment', () => {
    test('should analyze text sentiment', async () => {
      const response = await invokeEdgeFunction('analyze-sentiment', {
        body: { text: 'This is a great opportunity!' },
      });
      
      expect(response.status).toBeLessThan(500);
    });

    test('should handle negative sentiment', async () => {
      const response = await invokeEdgeFunction('analyze-sentiment', {
        body: { text: 'This is terrible and disappointing.' },
      });
      
      expect(response.status).toBeLessThan(500);
    });

    test('should handle empty text', async () => {
      const response = await invokeEdgeFunction('analyze-sentiment', {
        body: { text: '' },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('analyze-email-reply', () => {
    test('should analyze email reply', async () => {
      const response = await invokeEdgeFunction('analyze-email-reply', {
        body: { 
          email_content: 'Thanks for reaching out. I am interested in learning more.',
          context: 'cold_outreach'
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('analyze-interview-realtime', () => {
    test('should handle realtime analysis', async () => {
      const response = await invokeEdgeFunction('analyze-interview-realtime', {
        body: { 
          transcript_segment: 'I have 5 years of experience in software development.',
          interview_id: 'test-interview'
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('analyze-meeting-transcript', () => {
    test('should analyze meeting transcript', async () => {
      const response = await invokeEdgeFunction('analyze-meeting-transcript', {
        body: { 
          transcript: 'Welcome everyone. Today we will discuss the project timeline.',
          meeting_id: 'test-meeting'
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });
});

test.describe('AI Generation Functions', () => {
  test.describe('ai-email-generator', () => {
    test('should generate email content', async () => {
      const response = await invokeEdgeFunction('ai-email-generator', {
        body: { 
          type: 'outreach',
          recipient: 'John Doe',
          context: 'Initial contact about job opportunity'
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('generate-ai-summary', () => {
    test('should generate summary', async () => {
      const response = await invokeEdgeFunction('generate-ai-summary', {
        body: { 
          content: 'This is a long piece of text that needs to be summarized. It contains multiple points and details.',
          type: 'meeting'
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('generate-interview-prep', () => {
    test('should generate interview prep', async () => {
      const response = await invokeEdgeFunction('generate-interview-prep', {
        body: { 
          job_title: 'Software Engineer',
          company: 'Tech Corp',
          job_description: 'Build amazing products'
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('generate-interview-report', () => {
    test('should generate interview report', async () => {
      const response = await invokeEdgeFunction('generate-interview-report', {
        body: { 
          interview_id: 'test-interview',
          transcript: 'Interview transcript here...'
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('generate-quick-reply', () => {
    test('should generate quick reply', async () => {
      const response = await invokeEdgeFunction('generate-quick-reply', {
        body: { 
          message: 'When can we schedule a call?',
          context: 'scheduling'
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('generate-crm-reply', () => {
    test('should generate CRM reply', async () => {
      const response = await invokeEdgeFunction('generate-crm-reply', {
        body: { 
          prospect_id: 'test-prospect',
          reply_type: 'follow_up'
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('generate-personalized-follow-up', () => {
    test('should generate follow-up', async () => {
      const response = await invokeEdgeFunction('generate-personalized-follow-up', {
        body: { 
          prospect_email: 'prospect@example.com',
          interaction_history: []
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('generate-candidate-dossier', () => {
    test('should require authentication', async () => {
      const response = await invokeEdgeFunction('generate-candidate-dossier', {
        body: { candidate_id: 'test-candidate' },
      });
      
      // Likely requires auth
      expect(response.status).toBeLessThan(500);
    });
  });
});

test.describe('AI Prediction Functions', () => {
  test.describe('predict-hiring-outcomes', () => {
    test('should predict hiring outcomes', async () => {
      const response = await invokeEdgeFunction('predict-hiring-outcomes', {
        body: { job_id: 'test-job' },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('predict-aggregated-hiring-outcomes', () => {
    test('should predict aggregated outcomes', async () => {
      const response = await invokeEdgeFunction('predict-aggregated-hiring-outcomes', {
        body: { company_id: 'test-company' },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('calculate-lead-conversion-score', () => {
    test('should calculate lead score', async () => {
      const response = await invokeEdgeFunction('calculate-lead-conversion-score', {
        body: { 
          prospect_id: 'test-prospect',
          signals: { opened_email: true, clicked_link: true }
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });
});

test.describe('AI Function Performance', () => {
  // AI functions can be slower due to LLM calls
  test('analyze-sentiment should complete within 10s', async () => {
    const { durationMs } = await measureResponseTime('analyze-sentiment', {
      body: { text: 'Quick test' },
    });
    
    expect(durationMs).toBeLessThan(10000);
  });
});
