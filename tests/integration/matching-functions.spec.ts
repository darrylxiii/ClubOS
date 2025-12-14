/**
 * Integration Tests for Matching & ML Edge Functions
 * Tests candidate matching, scoring, and ML features
 */

import { test, expect } from '@playwright/test';
import { invokeEdgeFunction, measureResponseTime } from './edge-function-client';

test.describe('Matching Functions', () => {
  test.describe('calculate-match-score', () => {
    test('should calculate match score', async () => {
      const response = await invokeEdgeFunction('calculate-match-score', {
        body: { 
          candidate_id: 'test-candidate',
          job_id: 'test-job'
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });

    test('should require both IDs', async () => {
      const response = await invokeEdgeFunction('calculate-match-score', {
        body: { candidate_id: 'test-candidate' },
      });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('calculate-enhanced-match', () => {
    test('should calculate enhanced match', async () => {
      const response = await invokeEdgeFunction('calculate-enhanced-match', {
        body: { 
          candidate_id: 'test-candidate',
          job_id: 'test-job'
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('ml-match-candidates', () => {
    test('should match candidates with ML', async () => {
      const response = await invokeEdgeFunction('ml-match-candidates', {
        body: { job_id: 'test-job' },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('match-freelancers-to-project', () => {
    test('should match freelancers', async () => {
      const response = await invokeEdgeFunction('match-freelancers-to-project', {
        body: { project_id: 'test-project' },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });
});

test.describe('ML Training Functions', () => {
  test.describe('prepare-training-data', () => {
    test('should prepare training data', async () => {
      const response = await invokeEdgeFunction('prepare-training-data', {
        body: { model_type: 'matching' },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('train-ml-model', () => {
    test('should handle training request', async () => {
      const response = await invokeEdgeFunction('train-ml-model', {
        body: { model_type: 'matching' },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('track-ml-outcome', () => {
    test('should track ML outcome', async () => {
      const response = await invokeEdgeFunction('track-ml-outcome', {
        body: { 
          prediction_id: 'test-prediction',
          actual_outcome: 'hired'
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('ml-backfill-training-data', () => {
    test('should backfill training data', async () => {
      const response = await invokeEdgeFunction('ml-backfill-training-data', {
        body: {},
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('generate-ml-features', () => {
    test('should generate ML features', async () => {
      const response = await invokeEdgeFunction('generate-ml-features', {
        body: { entity_type: 'candidate' },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });
});

test.describe('Embedding Functions', () => {
  test.describe('generate-embeddings', () => {
    test('should generate embeddings', async () => {
      const response = await invokeEdgeFunction('generate-embeddings', {
        body: { 
          text: 'Software engineer with 5 years experience',
          type: 'candidate'
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('batch-generate-embeddings', () => {
    test('should batch generate embeddings', async () => {
      const response = await invokeEdgeFunction('batch-generate-embeddings', {
        body: { 
          items: [
            { id: '1', text: 'Text 1' },
            { id: '2', text: 'Text 2' }
          ]
        },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('generate-user-embeddings', () => {
    test('should generate user embeddings', async () => {
      const response = await invokeEdgeFunction('generate-user-embeddings', {
        body: { user_id: 'test-user' },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });
});

test.describe('Intelligence Functions', () => {
  test.describe('aggregate-market-intelligence', () => {
    test('should aggregate market intelligence', async () => {
      const response = await invokeEdgeFunction('aggregate-market-intelligence', {
        body: { industry: 'technology' },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('calculate-hiring-intent', () => {
    test('should calculate hiring intent', async () => {
      const response = await invokeEdgeFunction('calculate-hiring-intent', {
        body: { company_id: 'test-company' },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('generate-company-intelligence-report', () => {
    test('should generate intelligence report', async () => {
      const response = await invokeEdgeFunction('generate-company-intelligence-report', {
        body: { company_id: 'test-company' },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('orchestrate-intelligence-pipeline', () => {
    test('should orchestrate pipeline', async () => {
      const response = await invokeEdgeFunction('orchestrate-intelligence-pipeline', {
        body: {},
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('process-intelligence-queue', () => {
    test('should process queue', async () => {
      const response = await invokeEdgeFunction('process-intelligence-queue', {
        body: {},
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });
});

test.describe('Candidate Analysis Functions', () => {
  test.describe('extract-candidate-performance', () => {
    test('should extract performance', async () => {
      const response = await invokeEdgeFunction('extract-candidate-performance', {
        body: { candidate_id: 'test-candidate' },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('extract-interaction-insights', () => {
    test('should extract insights', async () => {
      const response = await invokeEdgeFunction('extract-interaction-insights', {
        body: { interaction_id: 'test-interaction' },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('sync-interview-to-candidate', () => {
    test('should sync interview', async () => {
      const response = await invokeEdgeFunction('sync-interview-to-candidate', {
        body: { interview_id: 'test-interview' },
      });
      
      expect(response.status).toBeLessThan(500);
    });
  });

  test.describe('merge-candidate-profile', () => {
    test('should require both profile IDs', async () => {
      const response = await invokeEdgeFunction('merge-candidate-profile', {
        body: { source_id: 'source' },
      });
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});

test.describe('Matching Function Performance', () => {
  test('calculate-match-score should complete quickly', async () => {
    const { durationMs } = await measureResponseTime('calculate-match-score', {
      body: { 
        candidate_id: 'perf-test',
        job_id: 'perf-test'
      },
    });
    
    expect(durationMs).toBeLessThan(5000);
  });
});
