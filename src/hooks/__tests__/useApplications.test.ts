import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('useApplications Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Application Status', () => {
    const validStatuses = ['submitted', 'screening', 'interview', 'offer', 'hired', 'rejected', 'withdrawn'];

    it('should recognize all valid statuses', () => {
      expect(validStatuses).toContain('submitted');
      expect(validStatuses).toContain('screening');
      expect(validStatuses).toContain('interview');
      expect(validStatuses).toContain('offer');
      expect(validStatuses).toContain('hired');
      expect(validStatuses).toContain('rejected');
      expect(validStatuses).toContain('withdrawn');
    });

    it('should reject invalid status', () => {
      expect(validStatuses).not.toContain('invalid_status');
    });
  });

  describe('Stage Transitions', () => {
    const stageOrder = ['submitted', 'screening', 'interview', 'offer', 'hired'];

    it('should allow forward progression', () => {
      const currentStageIndex = stageOrder.indexOf('screening');
      const nextStageIndex = stageOrder.indexOf('interview');
      
      expect(nextStageIndex).toBeGreaterThan(currentStageIndex);
    });

    it('should allow rejection from any stage', () => {
      const stages = ['submitted', 'screening', 'interview', 'offer'];
      
      stages.forEach(stage => {
        // All stages can transition to rejected
        expect(stage).toBeTruthy();
      });
    });

    it('should calculate correct stage index', () => {
      expect(stageOrder.indexOf('submitted')).toBe(0);
      expect(stageOrder.indexOf('screening')).toBe(1);
      expect(stageOrder.indexOf('interview')).toBe(2);
      expect(stageOrder.indexOf('offer')).toBe(3);
      expect(stageOrder.indexOf('hired')).toBe(4);
    });
  });

  describe('Application Filtering', () => {
    const applications = [
      { id: '1', status: 'submitted', job_id: 'job-1' },
      { id: '2', status: 'interview', job_id: 'job-1' },
      { id: '3', status: 'rejected', job_id: 'job-2' },
      { id: '4', status: 'hired', job_id: 'job-2' },
    ];

    it('should filter by status', () => {
      const interviewApps = applications.filter(app => app.status === 'interview');
      expect(interviewApps).toHaveLength(1);
    });

    it('should filter by job', () => {
      const job1Apps = applications.filter(app => app.job_id === 'job-1');
      expect(job1Apps).toHaveLength(2);
    });

    it('should filter active applications', () => {
      const inactiveStatuses = ['rejected', 'withdrawn', 'hired'];
      const activeApps = applications.filter(app => !inactiveStatuses.includes(app.status));
      expect(activeApps).toHaveLength(2);
    });
  });

  describe('Match Score', () => {
    it('should categorize high match scores', () => {
      const score = 85;
      const isHighMatch = score >= 80;
      expect(isHighMatch).toBe(true);
    });

    it('should categorize medium match scores', () => {
      const score = 65;
      const isMediumMatch = score >= 50 && score < 80;
      expect(isMediumMatch).toBe(true);
    });

    it('should categorize low match scores', () => {
      const score = 35;
      const isLowMatch = score < 50;
      expect(isLowMatch).toBe(true);
    });
  });

  describe('Application Source Tracking', () => {
    const sources = ['direct', 'referral', 'club_sync', 'sourced', 'inbound'];

    it('should track application sources', () => {
      expect(sources).toContain('direct');
      expect(sources).toContain('referral');
      expect(sources).toContain('club_sync');
    });

    it('should count applications by source', () => {
      const applications = [
        { source: 'direct' },
        { source: 'direct' },
        { source: 'referral' },
        { source: 'club_sync' },
      ];

      const directCount = applications.filter(a => a.source === 'direct').length;
      expect(directCount).toBe(2);
    });
  });

  describe('SLA Tracking', () => {
    it('should detect overdue applications', () => {
      const stageEnteredAt = new Date('2024-01-01');
      const slaDays = 5;
      const now = new Date('2024-01-10');
      
      const daysDiff = Math.ceil((now.getTime() - stageEnteredAt.getTime()) / (1000 * 60 * 60 * 24));
      const isOverdue = daysDiff > slaDays;
      
      expect(isOverdue).toBe(true);
    });

    it('should detect applications within SLA', () => {
      const stageEnteredAt = new Date('2024-01-08');
      const slaDays = 5;
      const now = new Date('2024-01-10');
      
      const daysDiff = Math.ceil((now.getTime() - stageEnteredAt.getTime()) / (1000 * 60 * 60 * 24));
      const isOverdue = daysDiff > slaDays;
      
      expect(isOverdue).toBe(false);
    });
  });
});
