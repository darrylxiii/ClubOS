/**
 * Email Configuration - Centralized sender addresses and branding
 * The Quantum Club Email System
 */

// Production domain for all email assets
export const EMAIL_ASSETS_BASE_URL = 'https://thequantumclub.app';

// Hosted email logos (publicly accessible)
export const EMAIL_LOGOS = {
  cloverIcon80: `${EMAIL_ASSETS_BASE_URL}/quantum-clover-icon.png`,
  cloverIcon40: `${EMAIL_ASSETS_BASE_URL}/lovable-uploads/57a00fec-4cc3-44e5-a5d9-c4a1a4c3f6d6.png`,
  fullLogo: `${EMAIL_ASSETS_BASE_URL}/lovable-uploads/57a00fec-4cc3-44e5-a5d9-c4a1a4c3f6d6.png`,
} as const;

// Standardized email sender addresses
export const EMAIL_SENDERS = {
  bookings: 'The Quantum Club <bookings@thequantumclub.nl>',
  meetings: 'The Quantum Club <meetings@thequantumclub.nl>',
  verification: 'The Quantum Club <verify@thequantumclub.nl>',
  notifications: 'The Quantum Club <notifications@thequantumclub.nl>',
  referrals: 'The Quantum Club <invites@thequantumclub.nl>',
  system: 'The Quantum Club <noreply@thequantumclub.nl>',
  security: 'The Quantum Club <security@thequantumclub.nl>',
  reminders: 'The Quantum Club <reminders@thequantumclub.nl>',
  clubAI: 'Club AI <ai@thequantumclub.nl>',
} as const;

// Brand colors for emails (use solid colors for maximum compatibility)
export const EMAIL_COLORS = {
  gold: '#C9A24E',
  ivory: '#F5F4EF',
  eclipse: '#0E0E10',
  cardBg: '#1a1a1c',
  textPrimary: '#F5F4EF',
  textSecondary: 'rgba(245, 244, 239, 0.7)',
  textMuted: 'rgba(245, 244, 239, 0.5)',
  border: 'rgba(201, 162, 78, 0.2)',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
} as const;

// Video platform icons (hosted publicly)
export const PLATFORM_ICONS = {
  google_meet: 'https://www.gstatic.com/meet/google_meet_horizontal_wordmark_2020q4_1x_icon_124_40_292e71bcb52a56e2a9005164118f183b.png',
  zoom: 'https://st1.zoom.us/zoom.ico',
  club_meetings: `${EMAIL_ASSETS_BASE_URL}/quantum-clover-icon.png`,
  teams: 'https://upload.wikimedia.org/wikipedia/commons/c/c9/Microsoft_Office_Teams_%282018%E2%80%93present%29.svg',
} as const;

// App URLs
export const getEmailAppUrl = (): string => {
  return Deno.env.get('APP_URL') || 'https://thequantumclub.app';
};

// Support contact
export const SUPPORT_EMAIL = 'support@thequantumclub.nl';
export const COMPANY_NAME = 'The Quantum Club';
export const TAGLINE = 'Exclusive Talent Network';
