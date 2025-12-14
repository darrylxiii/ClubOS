/**
 * MSW Handlers for Supabase API Mocking
 * Used in unit tests to mock API responses
 */
import { http, HttpResponse } from 'msw';

const SUPABASE_URL = 'https://dpjucecmoyfzrduhlctt.supabase.co';

// User fixtures
export const mockUsers = {
  admin: {
    id: 'admin-uuid-123',
    email: 'admin@thequantumclub.com',
    role: 'admin',
  },
  candidate: {
    id: 'candidate-uuid-456',
    email: 'candidate@example.com',
    role: 'candidate',
  },
  partner: {
    id: 'partner-uuid-789',
    email: 'partner@company.com',
    role: 'partner',
  },
};

// Job fixtures
export const mockJobs = [
  {
    id: 'job-1',
    title: 'Senior Software Engineer',
    company_id: 'company-1',
    status: 'published',
    salary_min: 100000,
    salary_max: 150000,
  },
  {
    id: 'job-2',
    title: 'Product Manager',
    company_id: 'company-1',
    status: 'published',
    salary_min: 120000,
    salary_max: 180000,
  },
];

// Application fixtures
export const mockApplications = [
  {
    id: 'app-1',
    job_id: 'job-1',
    candidate_id: 'candidate-uuid-456',
    status: 'submitted',
    current_stage_index: 0,
  },
];

// Define handlers
export const handlers = [
  // Auth endpoints
  http.post(`${SUPABASE_URL}/auth/v1/token`, () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'mock-refresh-token',
      user: mockUsers.candidate,
    });
  }),

  http.get(`${SUPABASE_URL}/auth/v1/user`, () => {
    return HttpResponse.json(mockUsers.candidate);
  }),

  // REST API endpoints
  http.get(`${SUPABASE_URL}/rest/v1/jobs`, () => {
    return HttpResponse.json(mockJobs);
  }),

  http.get(`${SUPABASE_URL}/rest/v1/applications`, () => {
    return HttpResponse.json(mockApplications);
  }),

  http.get(`${SUPABASE_URL}/rest/v1/profiles`, () => {
    return HttpResponse.json([]);
  }),

  // Edge function endpoints
  http.post(`${SUPABASE_URL}/functions/v1/*`, () => {
    return HttpResponse.json({ success: true });
  }),
];

export { http, HttpResponse };
