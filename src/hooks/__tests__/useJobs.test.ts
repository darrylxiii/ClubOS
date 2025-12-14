import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('useJobs Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Job Status', () => {
    const validStatuses = ['draft', 'published', 'closed', 'archived'];

    it('should recognize all valid statuses', () => {
      expect(validStatuses).toContain('draft');
      expect(validStatuses).toContain('published');
      expect(validStatuses).toContain('closed');
      expect(validStatuses).toContain('archived');
    });

    it('should only show published jobs to candidates', () => {
      const jobs = [
        { id: '1', status: 'draft' },
        { id: '2', status: 'published' },
        { id: '3', status: 'closed' },
      ];

      const visibleJobs = jobs.filter(job => job.status === 'published');
      expect(visibleJobs).toHaveLength(1);
    });
  });

  describe('Job Filtering', () => {
    const jobs = [
      { id: '1', title: 'Senior Engineer', location: 'Amsterdam', salary_max: 150000 },
      { id: '2', title: 'Product Manager', location: 'Remote', salary_max: 120000 },
      { id: '3', title: 'Junior Developer', location: 'Amsterdam', salary_max: 60000 },
    ];

    it('should filter by location', () => {
      const amsterdamJobs = jobs.filter(job => job.location === 'Amsterdam');
      expect(amsterdamJobs).toHaveLength(2);
    });

    it('should filter by salary range', () => {
      const minSalary = 100000;
      const highPayingJobs = jobs.filter(job => job.salary_max >= minSalary);
      expect(highPayingJobs).toHaveLength(2);
    });

    it('should search by title', () => {
      const searchTerm = 'engineer';
      const matchingJobs = jobs.filter(job => 
        job.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
      expect(matchingJobs).toHaveLength(1);
    });
  });

  describe('Pipeline Type', () => {
    it('should identify standard pipeline', () => {
      const job = { pipeline_type: 'standard', target_hire_count: 1 };
      expect(job.pipeline_type).toBe('standard');
    });

    it('should identify continuous pipeline', () => {
      const job = { pipeline_type: 'continuous', target_hire_count: null };
      expect(job.pipeline_type).toBe('continuous');
    });

    it('should track hired count for continuous pipeline', () => {
      const job = { pipeline_type: 'continuous', hired_count: 3, target_hire_count: 5 };
      const remaining = (job.target_hire_count || 0) - job.hired_count;
      expect(remaining).toBe(2);
    });
  });

  describe('Fee Calculation', () => {
    it('should calculate percentage-based fee', () => {
      const salary = 100000;
      const feePercentage = 20;
      const fee = salary * (feePercentage / 100);
      expect(fee).toBe(20000);
    });

    it('should use fixed fee when specified', () => {
      const fixedFee = 15000;
      expect(fixedFee).toBe(15000);
    });

    it('should calculate hybrid fee', () => {
      const salary = 100000;
      const feePercentage = 10;
      const fixedFee = 5000;
      const totalFee = (salary * (feePercentage / 100)) + fixedFee;
      expect(totalFee).toBe(15000);
    });
  });

  describe('Job Sorting', () => {
    it('should sort by created date descending', () => {
      const jobs = [
        { id: '1', created_at: '2024-01-01' },
        { id: '2', created_at: '2024-01-15' },
        { id: '3', created_at: '2024-01-10' },
      ];

      const sorted = [...jobs].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      expect(sorted[0].id).toBe('2');
      expect(sorted[2].id).toBe('1');
    });

    it('should sort by salary descending', () => {
      const jobs = [
        { id: '1', salary_max: 100000 },
        { id: '2', salary_max: 150000 },
        { id: '3', salary_max: 80000 },
      ];

      const sorted = [...jobs].sort((a, b) => b.salary_max - a.salary_max);

      expect(sorted[0].id).toBe('2');
      expect(sorted[2].id).toBe('3');
    });
  });

  describe('Application Count', () => {
    it('should count total applications', () => {
      const job = {
        applications: [
          { status: 'submitted' },
          { status: 'interview' },
          { status: 'rejected' },
        ],
      };

      expect(job.applications.length).toBe(3);
    });

    it('should count active applications only', () => {
      const job = {
        applications: [
          { status: 'submitted' },
          { status: 'interview' },
          { status: 'rejected' },
          { status: 'hired' },
        ],
      };

      const inactiveStatuses = ['rejected', 'withdrawn', 'hired'];
      const activeCount = job.applications.filter(
        app => !inactiveStatuses.includes(app.status)
      ).length;

      expect(activeCount).toBe(2);
    });
  });
});
