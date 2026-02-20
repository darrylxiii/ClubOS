/**
 * Email Configuration - Centralized sender addresses and branding
 * The Quantum Club Email System
 */

// Production domain for all email assets
export const EMAIL_ASSETS_BASE_URL = 'https://os.thequantumclub.com';

// Hosted email logos (publicly accessible)
export const EMAIL_LOGOS = {
  // Primary header logo - OVERSIZED for clear branding
  fullBrand: `${EMAIL_ASSETS_BASE_URL}/quantum-clover-icon.png`,
  // Standard clover icon
  cloverIcon: `${EMAIL_ASSETS_BASE_URL}/quantum-clover-icon.png`,
  // Small QC icon for meeting join buttons
  qcIconLight: `${EMAIL_ASSETS_BASE_URL}/qc-icon-light.png`,
  qcIconDark: `${EMAIL_ASSETS_BASE_URL}/qc-icon-dark.png`,
  // Legacy aliases (for backward compatibility)
  cloverIcon80: `${EMAIL_ASSETS_BASE_URL}/quantum-clover-icon.png`,
  cloverIcon40: `${EMAIL_ASSETS_BASE_URL}/quantum-clover-icon.png`,
  fullLogo: `${EMAIL_ASSETS_BASE_URL}/quantum-clover-icon.png`,
} as const;

// Logo sizes (in pixels)
export const EMAIL_LOGO_SIZES = {
  headerBrand: 180,   // Full-size for prominent branding
  standard: 80,       // Standard usage
  meetingCard: 40,    // Small icon for meeting cards
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
// Light-mode defaults — dark-mode overrides are in base-template.ts media query
export const EMAIL_COLORS = {
  gold: '#C9A24E',
  ivory: '#F5F4EF',
  eclipse: '#0E0E10',
  cardBg: '#1a1a1c',
  // Light-mode text (legible on white #ffffff body)
  textPrimary: '#0E0E10',
  textSecondary: '#555555',
  textMuted: '#888888',
  border: '#e5e7eb',
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

// GIF header for all outbound emails
// NOTE: Must be an absolute public URL reachable by all email clients worldwide.
// The published Lovable app URL serves the public/ folder reliably.
export const EMAIL_HEADER_GIF = 'https://os.thequantumclub.com/email-header.gif';


// App URLs - Production domain is bytqc.com
export const getEmailAppUrl = (): string => {
  return Deno.env.get('APP_URL') || 'https://os.thequantumclub.com';
};

// Support contact
export const SUPPORT_EMAIL = 'support@thequantumclub.nl';
export const COMPANY_NAME = 'The Quantum Club';
export const TAGLINE = 'Exclusive Talent Network';
