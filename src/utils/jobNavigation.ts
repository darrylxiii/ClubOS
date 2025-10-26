/**
 * Job Navigation Utilities
 * Smart role-based navigation between candidate and admin/partner views
 */

export type UserRole = 'admin' | 'partner' | 'company_admin' | 'recruiter' | 'user' | 'strategist' | null;

/**
 * Get the appropriate job view path based on user role
 */
export const getJobViewPath = (jobId: string, userRole?: UserRole): string => {
  // Admin/Partner: go to dashboard
  if (userRole === 'admin' || userRole === 'partner') {
    return `/jobs/${jobId}/dashboard`;
  }
  // Candidate/User: go to detail page
  return `/jobs/${jobId}`;
};

/**
 * Get the candidate preview path (always returns candidate view)
 */
export const getJobPreviewPath = (jobId: string): string => {
  return `/jobs/${jobId}`;
};

/**
 * Check if user should see admin/partner controls
 */
export const canManageJob = (userRole?: UserRole): boolean => {
  return userRole === 'admin' || userRole === 'partner' || userRole === 'strategist';
};
