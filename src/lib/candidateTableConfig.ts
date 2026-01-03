/**
 * Unified Candidate Table Configuration
 * Defines column sets, formatters, and display logic for candidate tables
 * Used by Admin, Partner, CRM, and Leaderboard views
 */

import { calculateUnifiedScore, getScoreTierColor, getScoreTierLabel } from './unifiedScoring';

export type CandidateColumnKey = 
  | 'name'
  | 'email'
  | 'phone'
  | 'currentRole'
  | 'company'
  | 'location'
  | 'skills'
  | 'experience'
  | 'status'
  | 'score'
  | 'matchScore'
  | 'completeness'
  | 'lastActivity'
  | 'applications'
  | 'source'
  | 'tags'
  | 'actions';

export interface CandidateColumnDef {
  key: CandidateColumnKey;
  label: string;
  sortable: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  hideOnMobile?: boolean;
  requiresPrivacy?: boolean;
}

// Column definitions for each view
const ADMIN_COLUMNS: CandidateColumnDef[] = [
  { key: 'name', label: 'Candidate', sortable: true, width: '200px' },
  { key: 'email', label: 'Email', sortable: true, width: '200px', hideOnMobile: true },
  { key: 'currentRole', label: 'Current Role', sortable: true, width: '180px', hideOnMobile: true },
  { key: 'status', label: 'Status', sortable: true, width: '100px' },
  { key: 'score', label: 'Score', sortable: true, width: '80px', align: 'center' },
  { key: 'completeness', label: 'Profile', sortable: true, width: '80px', align: 'center', hideOnMobile: true },
  { key: 'applications', label: 'Apps', sortable: true, width: '60px', align: 'center', hideOnMobile: true },
  { key: 'lastActivity', label: 'Last Active', sortable: true, width: '100px', hideOnMobile: true },
  { key: 'actions', label: '', sortable: false, width: '60px', align: 'right' },
];

const PARTNER_COLUMNS: CandidateColumnDef[] = [
  { key: 'name', label: 'Candidate', sortable: true, width: '200px' },
  { key: 'currentRole', label: 'Current Role', sortable: true, width: '180px' },
  { key: 'experience', label: 'Experience', sortable: true, width: '100px', hideOnMobile: true },
  { key: 'matchScore', label: 'Match', sortable: true, width: '80px', align: 'center' },
  { key: 'status', label: 'Status', sortable: true, width: '100px' },
  { key: 'actions', label: '', sortable: false, width: '80px', align: 'right' },
];

const LEADERBOARD_COLUMNS: CandidateColumnDef[] = [
  { key: 'name', label: 'Candidate', sortable: true, width: '200px' },
  { key: 'score', label: 'Unified Score', sortable: true, width: '120px', align: 'center' },
  { key: 'matchScore', label: 'Match', sortable: true, width: '80px', align: 'center' },
  { key: 'completeness', label: 'Profile', sortable: true, width: '80px', align: 'center' },
  { key: 'lastActivity', label: 'Activity', sortable: true, width: '100px' },
  { key: 'applications', label: 'Apps', sortable: true, width: '60px', align: 'center' },
];

const CRM_COLUMNS: CandidateColumnDef[] = [
  { key: 'name', label: 'Contact', sortable: true, width: '180px' },
  { key: 'company', label: 'Company', sortable: true, width: '150px' },
  { key: 'currentRole', label: 'Title', sortable: true, width: '150px', hideOnMobile: true },
  { key: 'email', label: 'Email', sortable: true, width: '180px', requiresPrivacy: true },
  { key: 'phone', label: 'Phone', sortable: true, width: '120px', requiresPrivacy: true, hideOnMobile: true },
  { key: 'source', label: 'Source', sortable: true, width: '100px', hideOnMobile: true },
  { key: 'tags', label: 'Tags', sortable: false, width: '150px', hideOnMobile: true },
  { key: 'actions', label: '', sortable: false, width: '60px', align: 'right' },
];

export type CandidateViewType = 'admin' | 'partner' | 'leaderboard' | 'crm';

/**
 * Get column definitions for a specific view
 */
export function getCandidateColumns(view: CandidateViewType): CandidateColumnDef[] {
  switch (view) {
    case 'admin':
      return ADMIN_COLUMNS;
    case 'partner':
      return PARTNER_COLUMNS;
    case 'leaderboard':
      return LEADERBOARD_COLUMNS;
    case 'crm':
      return CRM_COLUMNS;
    default:
      return ADMIN_COLUMNS;
  }
}

/**
 * Calculate and format unified score for display
 */
export function formatCandidateScore(candidate: {
  match_score?: number;
  last_activity_at?: string | null;
  profile_completeness?: number;
  current_stage_index?: number;
  assessment_score?: number;
  interview_performance?: number | null;
}): {
  score: number;
  tier: string;
  tierLabel: string;
  tierColor: string;
  recommendation: string | null;
} {
  const unified = calculateUnifiedScore({
    matchScore: candidate.match_score,
    lastActivityAt: candidate.last_activity_at,
    profileCompleteness: candidate.profile_completeness,
    currentStageIndex: candidate.current_stage_index,
    assessmentScore: candidate.assessment_score,
    interviewPerformance: candidate.interview_performance,
  });
  
  return {
    score: unified.score,
    tier: unified.tier,
    tierLabel: getScoreTierLabel(unified.tier),
    tierColor: getScoreTierColor(unified.tier),
    recommendation: unified.recommendation,
  };
}

/**
 * Format experience years for display
 */
export function formatExperience(years: number | null | undefined): string {
  if (years === null || years === undefined) return '—';
  if (years < 1) return '< 1 yr';
  if (years === 1) return '1 yr';
  return `${years} yrs`;
}

/**
 * Format profile completeness as percentage
 */
export function formatCompleteness(percent: number | null | undefined): string {
  if (percent === null || percent === undefined) return '—';
  return `${Math.round(percent)}%`;
}

/**
 * Format last activity date
 */
export function formatLastActivity(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Never';
  
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  
  return `${Math.floor(diffDays / 365)}y ago`;
}

/**
 * Get status badge for candidate pipeline status
 */
export function getCandidateStatusDisplay(status: string): {
  label: string;
  color: string;
} {
  const statusMap: Record<string, { label: string; color: string }> = {
    active: { label: 'Active', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    new: { label: 'New', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    screening: { label: 'Screening', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    interviewing: { label: 'Interviewing', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    offer: { label: 'Offer', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    hired: { label: 'Hired', color: 'bg-green-50 text-green-700 border-green-200' },
    rejected: { label: 'Rejected', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    withdrawn: { label: 'Withdrawn', color: 'bg-slate-50 text-slate-700 border-slate-200' },
    archived: { label: 'Archived', color: 'bg-gray-50 text-gray-700 border-gray-200' },
  };
  
  return statusMap[status?.toLowerCase()] || statusMap.active;
}

/**
 * Get sortable value for a candidate column
 */
export function getCandidateSortValue(
  candidate: any,
  column: CandidateColumnKey
): string | number | Date {
  switch (column) {
    case 'name':
      return candidate.full_name || candidate.name || '';
    case 'email':
      return candidate.email || '';
    case 'currentRole':
      return candidate.current_title || candidate.current_role || '';
    case 'company':
      return candidate.current_company || '';
    case 'status':
      return candidate.status || '';
    case 'score':
      return formatCandidateScore(candidate).score;
    case 'matchScore':
      return candidate.match_score ?? 0;
    case 'completeness':
      return candidate.profile_completeness ?? 0;
    case 'experience':
      return candidate.years_of_experience ?? 0;
    case 'applications':
      return candidate.application_count ?? 0;
    case 'lastActivity':
      return new Date(candidate.last_activity_at || candidate.updated_at || 0);
    default:
      return '';
  }
}

/**
 * Sort candidates by column
 */
export function sortCandidates<T extends Record<string, any>>(
  candidates: T[],
  column: CandidateColumnKey,
  direction: 'asc' | 'desc'
): T[] {
  return [...candidates].sort((a, b) => {
    const aVal = getCandidateSortValue(a, column);
    const bVal = getCandidateSortValue(b, column);
    
    let comparison = 0;
    if (aVal < bVal) comparison = -1;
    if (aVal > bVal) comparison = 1;
    
    return direction === 'desc' ? -comparison : comparison;
  });
}

/**
 * Filter candidates by search term
 */
export function filterCandidatesBySearch<T extends Record<string, any>>(
  candidates: T[],
  searchTerm: string
): T[] {
  if (!searchTerm.trim()) return candidates;
  
  const term = searchTerm.toLowerCase();
  
  return candidates.filter(candidate => {
    const searchableFields = [
      candidate.full_name,
      candidate.name,
      candidate.email,
      candidate.current_title,
      candidate.current_company,
      candidate.location,
      ...(candidate.skills || []),
    ];
    
    return searchableFields.some(field => 
      field?.toString().toLowerCase().includes(term)
    );
  });
}

/**
 * Privacy-aware field accessor
 */
export function getCandidateFieldWithPrivacy(
  candidate: any,
  field: CandidateColumnKey,
  hasAccess: boolean
): string {
  if (!hasAccess) {
    switch (field) {
      case 'email':
        return candidate.email ? '***@***' : '—';
      case 'phone':
        return candidate.phone ? '***-****' : '—';
      default:
        return '—';
    }
  }
  
  switch (field) {
    case 'email':
      return candidate.email || '—';
    case 'phone':
      return candidate.phone || '—';
    default:
      return '—';
  }
}
