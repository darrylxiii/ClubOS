/**
 * Unified Application Table Configuration
 * Defines column sets, formatters, and display logic for application tables
 * Used by Admin, Partner, and Candidate views
 */

import { getStatusConfig } from './statusConfig';
import { getApplicationStageInfo } from './applicationStageUtils';

export type ApplicationColumnKey = 
  | 'candidate'
  | 'position'
  | 'company'
  | 'stage'
  | 'status'
  | 'appliedAt'
  | 'lastActivity'
  | 'salary'
  | 'matchScore'
  | 'actions';

export interface ApplicationColumnDef {
  key: ApplicationColumnKey;
  label: string;
  sortable: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  hideOnMobile?: boolean;
}

// Column definitions for each view
const ADMIN_COLUMNS: ApplicationColumnDef[] = [
  { key: 'candidate', label: 'Candidate', sortable: true, width: '200px' },
  { key: 'position', label: 'Position', sortable: true, width: '180px' },
  { key: 'company', label: 'Company', sortable: true, width: '150px', hideOnMobile: true },
  { key: 'stage', label: 'Stage', sortable: true, width: '140px' },
  { key: 'status', label: 'Status', sortable: true, width: '100px' },
  { key: 'appliedAt', label: 'Applied', sortable: true, width: '100px', hideOnMobile: true },
  { key: 'matchScore', label: 'Score', sortable: true, width: '80px', align: 'center', hideOnMobile: true },
  { key: 'actions', label: '', sortable: false, width: '60px', align: 'right' },
];

const PARTNER_COLUMNS: ApplicationColumnDef[] = [
  { key: 'candidate', label: 'Candidate', sortable: true, width: '200px' },
  { key: 'position', label: 'Position', sortable: true, width: '180px' },
  { key: 'stage', label: 'Stage', sortable: true, width: '140px' },
  { key: 'status', label: 'Status', sortable: true, width: '100px' },
  { key: 'lastActivity', label: 'Last Activity', sortable: true, width: '120px', hideOnMobile: true },
  { key: 'matchScore', label: 'Match', sortable: true, width: '80px', align: 'center' },
  { key: 'actions', label: '', sortable: false, width: '80px', align: 'right' },
];

const CANDIDATE_COLUMNS: ApplicationColumnDef[] = [
  { key: 'company', label: 'Company', sortable: true, width: '180px' },
  { key: 'position', label: 'Position', sortable: true, width: '200px' },
  { key: 'stage', label: 'Stage', sortable: true, width: '140px' },
  { key: 'appliedAt', label: 'Applied', sortable: true, width: '100px', hideOnMobile: true },
  { key: 'actions', label: '', sortable: false, width: '60px', align: 'right' },
];

const KANBAN_COLUMNS: ApplicationColumnDef[] = [
  { key: 'candidate', label: 'Candidate', sortable: false, width: '100%' },
  { key: 'position', label: 'Position', sortable: false },
  { key: 'matchScore', label: 'Score', sortable: false },
];

export type ViewType = 'admin' | 'partner' | 'candidate' | 'kanban';

/**
 * Get column definitions for a specific view
 */
export function getApplicationColumns(view: ViewType): ApplicationColumnDef[] {
  switch (view) {
    case 'admin':
      return ADMIN_COLUMNS;
    case 'partner':
      return PARTNER_COLUMNS;
    case 'candidate':
      return CANDIDATE_COLUMNS;
    case 'kanban':
      return KANBAN_COLUMNS;
    default:
      return ADMIN_COLUMNS;
  }
}

/**
 * Format salary range for display
 */
export function formatSalaryRange(
  min?: number | null,
  max?: number | null,
  currency: string = 'EUR'
): string {
  if (!min && !max) return '—';
  
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  });
  
  if (min && max) {
    return `${formatter.format(min)} - ${formatter.format(max)}`;
  }
  
  return min ? `${formatter.format(min)}+` : `Up to ${formatter.format(max!)}`;
}

/**
 * Format date for display in tables
 */
export function formatApplicationDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get status badge props from unified status config
 */
export function getApplicationStatusBadge(status: string): {
  label: string;
  className: string;
} {
  const config = getStatusConfig('application', status);
  if (!config) {
    return {
      label: status || 'Unknown',
      className: 'bg-muted text-muted-foreground border-border/50',
    };
  }
  return {
    label: config.label,
    className: config.className,
  };
}

/**
 * Get stage display info using shared utility
 */
export function getStageDisplay(application: {
  current_stage_index?: number;
  stages?: any[];
  status?: string;
}): ReturnType<typeof getApplicationStageInfo> {
  return getApplicationStageInfo({
    currentStageIndex: application.current_stage_index ?? 0,
    stages: application.stages ?? [],
    status: application.status ?? 'active',
  });
}

/**
 * Mask phone number for privacy
 */
export function maskPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '—';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 4) return '***';
  return `***${cleaned.slice(-4)}`;
}

/**
 * Get sortable value for a column
 */
export function getApplicationSortValue(
  application: any,
  column: ApplicationColumnKey
): string | number | Date {
  switch (column) {
    case 'candidate':
      return application.candidate_name || application.profiles?.full_name || '';
    case 'position':
      return application.position || application.job?.title || '';
    case 'company':
      return application.company_name || application.job?.companies?.name || '';
    case 'stage':
      return application.current_stage_index ?? 0;
    case 'status':
      return application.status || '';
    case 'appliedAt':
      return new Date(application.applied_at || application.created_at || 0);
    case 'lastActivity':
      return new Date(application.last_activity_at || application.updated_at || 0);
    case 'matchScore':
      return application.match_score ?? 0;
    case 'salary':
      return application.job?.salary_min ?? 0;
    default:
      return '';
  }
}

/**
 * Sort applications by column
 */
export function sortApplications<T extends Record<string, any>>(
  applications: T[],
  column: ApplicationColumnKey,
  direction: 'asc' | 'desc'
): T[] {
  return [...applications].sort((a, b) => {
    const aVal = getApplicationSortValue(a, column);
    const bVal = getApplicationSortValue(b, column);
    
    let comparison = 0;
    if (aVal < bVal) comparison = -1;
    if (aVal > bVal) comparison = 1;
    
    return direction === 'desc' ? -comparison : comparison;
  });
}

/**
 * Filter applications by search term
 */
export function filterApplicationsBySearch<T extends Record<string, any>>(
  applications: T[],
  searchTerm: string
): T[] {
  if (!searchTerm.trim()) return applications;
  
  const term = searchTerm.toLowerCase();
  
  return applications.filter(app => {
    const searchableFields = [
      app.candidate_name,
      app.profiles?.full_name,
      app.position,
      app.job?.title,
      app.company_name,
      app.job?.companies?.name,
      app.status,
    ];
    
    return searchableFields.some(field => 
      field?.toLowerCase().includes(term)
    );
  });
}
