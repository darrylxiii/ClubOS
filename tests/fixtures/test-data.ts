/**
 * Test Data Factories for E2E Tests
 * Provides consistent test data across all test suites
 */

export const testUsers = {
  candidate: {
    email: 'test.candidate@example.com',
    password: 'TestPassword123!',
    fullName: 'Test Candidate',
  },
  partner: {
    email: 'test.partner@example.com',
    password: 'TestPassword123!',
    fullName: 'Test Partner',
  },
  admin: {
    email: 'test.admin@example.com',
    password: 'TestPassword123!',
    fullName: 'Test Admin',
  },
  strategist: {
    email: 'test.strategist@example.com',
    password: 'TestPassword123!',
    fullName: 'Test Strategist',
  },
};

export const testCompany = {
  name: 'Test Company Inc',
  website: 'https://testcompany.com',
  industry: 'Technology',
  size: '50-200',
};

export const testJob = {
  title: 'Senior Software Engineer',
  description: 'We are looking for a senior software engineer to join our team.',
  location: 'Amsterdam, Netherlands',
  salaryMin: 80000,
  salaryMax: 120000,
  employmentType: 'full-time',
};

export const testBooking = {
  title: 'Interview Session',
  duration: 30,
  description: 'Technical interview for Senior Software Engineer position',
};

export function generateUniqueEmail(prefix: string = 'test'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `${prefix}.${timestamp}.${random}@example.com`;
}

export function generateTestPassword(): string {
  return `Test${Math.random().toString(36).substring(2, 8)}123!`;
}
