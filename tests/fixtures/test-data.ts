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
    email: 'admin@thequantumclub.com',
    password: 'Test123456!!',
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

export const testApplication = {
  coverLetter: 'I am excited to apply for this position...',
  resumeFile: 'test-resume.pdf',
};

export const testProfile = {
  firstName: 'Test',
  lastName: 'User',
  phone: '+31612345678',
  bio: 'Experienced software engineer with 5+ years of experience.',
  location: 'Amsterdam, Netherlands',
  linkedIn: 'https://linkedin.com/in/testuser',
  portfolio: 'https://testuser.dev',
};

export function generateUniqueEmail(prefix: string = 'test'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `${prefix}.${timestamp}.${random}@example.com`;
}

export function generateTestPassword(): string {
  return `Test${Math.random().toString(36).substring(2, 8)}123!`;
}

export function generateRandomName(): string {
  const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Davis'];
  return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
}
