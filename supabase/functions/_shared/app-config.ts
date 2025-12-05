/**
 * Centralized App Configuration
 * Phase 2: Replace hardcoded URLs with environment variables
 */

/**
 * Get the app URL from environment or fallback to production
 */
export function getAppUrl(): string {
  return (
    Deno.env.get('APP_URL') ||
    Deno.env.get('VITE_APP_URL') ||
    'https://app.thequantumclub.com'
  );
}

/**
 * Get the marketing site URL
 */
export function getSiteUrl(): string {
  return Deno.env.get('SITE_URL') || 'https://thequantumclub.nl';
}

/**
 * Get the support email
 */
export function getSupportEmail(): string {
  return 'support@thequantumclub.nl';
}

/**
 * Generate common app URLs
 */
export const AppUrls = {
  settings: () => `${getAppUrl()}/settings`,
  settingsNotifications: () => `${getAppUrl()}/settings?tab=notifications`,
  auth: () => `${getAppUrl()}/auth`,
  booking: (bookingId: string) => `${getAppUrl()}/bookings/${bookingId}`,
  candidate: (candidateId: string) => `${getAppUrl()}/candidate/${candidateId}`,
  meeting: (meetingCode: string) => `${getAppUrl()}/meetings/${meetingCode}`,
  invite: (token: string) => `${getAppUrl()}/invite/${token}`,
  profile: (profileId: string) => `${getAppUrl()}/profile/${profileId}`,
  job: (jobId: string) => `${getAppUrl()}/jobs/${jobId}`,
  application: (applicationId: string) => `${getAppUrl()}/applications/${applicationId}`,
};
