/**
 * Unified Systems Barrel Export
 * Central hub for all unified utilities, hooks, and components
 */

// Status configuration
export {
  getStatusConfig,
  deriveSyncStatus,
  normalizeApplicationStatus,
  normalizeJobStatus,
  statusConfigMap,
  type StatusDomain,
  type StatusConfig,
  type ApplicationStatus,
  type JobStatus,
  type SyncStatus,
  type AccountStatus,
  type AssetStatus,
  type InvoiceStatus,
  type BookingStatus,
  type ReferralStatus,
} from '../statusConfig';

// Notifications
export { notify, migrateToast, type NotifyOptions } from '../notify';

// Scoring utilities
export {
  calculateUnifiedScore,
  calculateCandidateScoreLegacy,
  getScoreTierColor,
  getScoreTierLabel,
  type UnifiedScore,
  type ScoringInput,
  type ScoringWeights,
  type ScoreBreakdown,
  type CandidateScore,
} from '../unifiedScoring';

// Application table configurations
export {
  getApplicationColumns,
  formatApplicationDate,
  formatSalaryRange,
  getApplicationStatusBadge,
  getStageDisplay,
  maskPhoneNumber,
  getApplicationSortValue,
  sortApplications,
  filterApplicationsBySearch,
  type ApplicationColumnDef,
  type ApplicationColumnKey,
  type ViewType,
} from '../applicationTableConfig';

// Candidate table configurations
export {
  getCandidateColumns,
  formatCandidateScore,
  formatExperience,
  formatCompleteness,
  formatLastActivity,
  getCandidateStatusDisplay,
  getCandidateSortValue,
  sortCandidates,
  filterCandidatesBySearch,
  getCandidateFieldWithPrivacy,
  type CandidateColumnDef,
  type CandidateColumnKey,
  type CandidateViewType,
} from '../candidateTableConfig';

// Application stage utilities
export {
  getApplicationStageInfo,
  getStageColor,
  normalizeStageLabel,
  type StageDisplayInfo,
} from '../applicationStageUtils';
