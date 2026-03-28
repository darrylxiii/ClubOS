/**
 * Decline source tracking — distinguishes WHO declined the candidate and WHY.
 * Stored in feedback metadata as `decline_source` across:
 *   - company_candidate_feedback.metadata
 *   - role_candidate_feedback.metadata
 *   - pipeline_audit_logs.metadata
 *   - candidate_interactions.metadata
 */

export type DeclineSource =
  | 'admin_declined'
  | 'partner_declined'
  | 'candidate_withdrew'
  | 'candidate_unresponsive'
  | 'position_closed'
  | 'mutual_decision';

export interface DeclineSourceConfig {
  value: DeclineSource;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  badgeClass: string;
  icon: 'shield' | 'building' | 'user-x' | 'ghost' | 'lock' | 'handshake';
}

export const DECLINE_SOURCES: DeclineSourceConfig[] = [
  {
    value: 'admin_declined',
    label: 'We Declined (Admin)',
    shortLabel: 'Admin Declined',
    description: 'Club OS team decided to decline this candidate',
    color: '#ef4444',
    badgeClass: 'bg-red-500/20 text-red-500 border-red-500/30',
    icon: 'shield',
  },
  {
    value: 'partner_declined',
    label: 'Partner Declined',
    shortLabel: 'Partner Declined',
    description: 'The hiring partner/company declined this candidate',
    color: '#f97316',
    badgeClass: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
    icon: 'building',
  },
  {
    value: 'candidate_withdrew',
    label: 'Candidate Withdrew',
    shortLabel: 'Candidate Withdrew',
    description: 'The candidate withdrew their application',
    color: '#8b5cf6',
    badgeClass: 'bg-violet-500/20 text-violet-500 border-violet-500/30',
    icon: 'user-x',
  },
  {
    value: 'candidate_unresponsive',
    label: 'Candidate Unresponsive',
    shortLabel: 'Unresponsive',
    description: 'The candidate stopped responding to outreach',
    color: '#6b7280',
    badgeClass: 'bg-gray-500/20 text-gray-500 border-gray-500/30',
    icon: 'ghost',
  },
  {
    value: 'position_closed',
    label: 'Position Closed',
    shortLabel: 'Position Closed',
    description: 'The role was filled or closed — not candidate-specific',
    color: '#0ea5e9',
    badgeClass: 'bg-sky-500/20 text-sky-500 border-sky-500/30',
    icon: 'lock',
  },
  {
    value: 'mutual_decision',
    label: 'Mutual Decision',
    shortLabel: 'Mutual',
    description: 'Both sides agreed to part ways',
    color: '#eab308',
    badgeClass: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
    icon: 'handshake',
  },
];

export const DECLINE_SOURCE_MAP = Object.fromEntries(
  DECLINE_SOURCES.map((s) => [s.value, s]),
) as Record<DeclineSource, DeclineSourceConfig>;

/** Get a decline source config by value, with fallback */
export function getDeclineSource(value: string | null | undefined): DeclineSourceConfig | null {
  if (!value) return null;
  return DECLINE_SOURCE_MAP[value as DeclineSource] ?? null;
}

/** Rejection reasons shared across all decline flows */
export const REJECTION_REASONS = [
  { value: 'skills_gap', label: 'Skills Gap' },
  { value: 'experience_junior', label: 'Too Junior' },
  { value: 'experience_senior', label: 'Too Senior' },
  { value: 'salary_high', label: 'Salary Too High' },
  { value: 'location', label: 'Location Mismatch' },
  { value: 'culture_fit', label: 'Culture Fit Concerns' },
  { value: 'communication', label: 'Communication Issues' },
  { value: 'timing', label: 'Bad Timing / Not Ready' },
  { value: 'better_offer', label: 'Accepted Another Offer' },
  { value: 'no_response', label: 'No Response' },
  { value: 'other', label: 'Other' },
] as const;

export const REJECTION_REASON_MAP = Object.fromEntries(
  REJECTION_REASONS.map((r) => [r.value, r.label]),
) as Record<string, string>;

export const REJECTION_COLORS: Record<string, string> = {
  skills_gap: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
  experience_junior: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
  experience_senior: 'bg-purple-500/20 text-purple-500 border-purple-500/30',
  salary_high: 'bg-red-500/20 text-red-500 border-red-500/30',
  location: 'bg-green-500/20 text-green-500 border-green-500/30',
  culture_fit: 'bg-pink-500/20 text-pink-500 border-pink-500/30',
  communication: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
  timing: 'bg-cyan-500/20 text-cyan-500 border-cyan-500/30',
  better_offer: 'bg-indigo-500/20 text-indigo-500 border-indigo-500/30',
  no_response: 'bg-gray-500/20 text-gray-500 border-gray-500/30',
  other: 'bg-gray-500/20 text-gray-500 border-gray-500/30',
};
