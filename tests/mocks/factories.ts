/**
 * Test Data Factories
 * Generate consistent test data across all test suites
 */

// User factory
export function createUser(overrides: Partial<{
  id: string;
  email: string;
  role: string;
  full_name: string;
}> = {}) {
  return {
    id: `user-${Math.random().toString(36).slice(2)}`,
    email: `test-${Date.now()}@example.com`,
    role: 'candidate',
    full_name: 'Test User',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// Job factory
export function createJob(overrides: Partial<{
  id: string;
  title: string;
  company_id: string;
  status: string;
  salary_min: number;
  salary_max: number;
}> = {}) {
  return {
    id: `job-${Math.random().toString(36).slice(2)}`,
    title: 'Software Engineer',
    company_id: 'company-1',
    status: 'published',
    salary_min: 80000,
    salary_max: 120000,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// Application factory
export function createApplication(overrides: Partial<{
  id: string;
  job_id: string;
  candidate_id: string;
  status: string;
  current_stage_index: number;
}> = {}) {
  return {
    id: `app-${Math.random().toString(36).slice(2)}`,
    job_id: 'job-1',
    candidate_id: 'candidate-1',
    status: 'submitted',
    current_stage_index: 0,
    applied_at: new Date().toISOString(),
    ...overrides,
  };
}

// Meeting factory
export function createMeeting(overrides: Partial<{
  id: string;
  title: string;
  scheduled_start: Date;
  scheduled_end: Date;
  host_id: string;
  status: string;
}> = {}) {
  const start = overrides.scheduled_start || new Date();
  const end = overrides.scheduled_end || new Date(start.getTime() + 60 * 60 * 1000);
  
  return {
    id: `meeting-${Math.random().toString(36).slice(2)}`,
    title: 'Test Meeting',
    scheduled_start: start.toISOString(),
    scheduled_end: end.toISOString(),
    host_id: 'host-1',
    status: 'scheduled',
    ...overrides,
  };
}

// Company factory
export function createCompany(overrides: Partial<{
  id: string;
  name: string;
  website: string;
}> = {}) {
  return {
    id: `company-${Math.random().toString(36).slice(2)}`,
    name: 'Test Company',
    website: 'https://testcompany.com',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// Candidate profile factory
export function createCandidateProfile(overrides: Partial<{
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  skills: string[];
}> = {}) {
  return {
    id: `candidate-${Math.random().toString(36).slice(2)}`,
    user_id: null,
    full_name: 'Test Candidate',
    email: `candidate-${Date.now()}@example.com`,
    skills: ['JavaScript', 'React', 'TypeScript'],
    created_at: new Date().toISOString(),
    ...overrides,
  };
}
