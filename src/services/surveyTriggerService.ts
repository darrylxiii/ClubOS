/**
 * Survey Trigger Service
 * Manages in-app survey eligibility and rate limiting
 * Optimized for PostHog free tier (250 responses/month)
 */

import { posthog } from '@/lib/posthog';

// Survey configuration
const SURVEY_CONFIG = {
  // Minimum days between showing any survey to same user
  minDaysBetweenSurveys: 14,
  // Minimum days between same survey type
  minDaysBetweenSameSurvey: 30,
  // Maximum surveys per month per user
  maxSurveysPerMonth: 2,
  // Survey cooldown after dismissal (days)
  dismissalCooldownDays: 60,
};

// Storage keys
const STORAGE_KEYS = {
  surveyHistory: 'tqc_survey_history',
  surveyDismissals: 'tqc_survey_dismissals',
  monthlyCount: 'tqc_survey_monthly_count',
};

interface SurveyHistoryEntry {
  surveyType: string;
  shownAt: number;
  responded: boolean;
}

interface SurveyDismissal {
  surveyType: string;
  dismissedAt: number;
}

/**
 * Get survey history from storage
 */
function getSurveyHistory(): SurveyHistoryEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.surveyHistory);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Get survey dismissals from storage
 */
function getSurveyDismissals(): SurveyDismissal[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.surveyDismissals);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Get monthly survey count
 */
function getMonthlyCount(): { month: string; count: number } {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.monthlyCount);
    if (!stored) return { month: getCurrentMonth(), count: 0 };
    
    const data = JSON.parse(stored);
    // Reset if different month
    if (data.month !== getCurrentMonth()) {
      return { month: getCurrentMonth(), count: 0 };
    }
    return data;
  } catch {
    return { month: getCurrentMonth(), count: 0 };
  }
}

function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

/**
 * Check if user is eligible for any survey
 */
export function canShowAnySurvey(): boolean {
  const history = getSurveyHistory();
  const monthlyData = getMonthlyCount();
  
  // Check monthly limit
  if (monthlyData.count >= SURVEY_CONFIG.maxSurveysPerMonth) {
    return false;
  }
  
  // Check time since last survey
  const lastSurvey = history.sort((a, b) => b.shownAt - a.shownAt)[0];
  if (lastSurvey) {
    const daysSinceLast = (Date.now() - lastSurvey.shownAt) / (1000 * 60 * 60 * 24);
    if (daysSinceLast < SURVEY_CONFIG.minDaysBetweenSurveys) {
      return false;
    }
  }
  
  return true;
}

/**
 * Check if specific survey type can be shown
 */
export function canShowSurvey(surveyType: string): boolean {
  if (!canShowAnySurvey()) return false;
  
  const history = getSurveyHistory();
  const dismissals = getSurveyDismissals();
  
  // Check dismissal cooldown
  const dismissal = dismissals.find(d => d.surveyType === surveyType);
  if (dismissal) {
    const daysSinceDismissal = (Date.now() - dismissal.dismissedAt) / (1000 * 60 * 60 * 24);
    if (daysSinceDismissal < SURVEY_CONFIG.dismissalCooldownDays) {
      return false;
    }
  }
  
  // Check time since same survey type
  const lastOfType = history
    .filter(h => h.surveyType === surveyType)
    .sort((a, b) => b.shownAt - a.shownAt)[0];
  
  if (lastOfType) {
    const daysSinceLast = (Date.now() - lastOfType.shownAt) / (1000 * 60 * 60 * 24);
    if (daysSinceLast < SURVEY_CONFIG.minDaysBetweenSameSurvey) {
      return false;
    }
  }
  
  return true;
}

/**
 * Record that a survey was shown
 */
export function recordSurveyShown(surveyType: string): void {
  const history = getSurveyHistory();
  history.push({
    surveyType,
    shownAt: Date.now(),
    responded: false,
  });
  localStorage.setItem(STORAGE_KEYS.surveyHistory, JSON.stringify(history));
  
  // Update monthly count
  const monthlyData = getMonthlyCount();
  monthlyData.count += 1;
  localStorage.setItem(STORAGE_KEYS.monthlyCount, JSON.stringify(monthlyData));
  
  // Track in PostHog
  posthog.capture('survey_shown', { survey_type: surveyType });
}

/**
 * Record survey response
 */
export function recordSurveyResponse(
  surveyType: string,
  response: Record<string, unknown>
): void {
  const history = getSurveyHistory();
  const latest = history
    .filter(h => h.surveyType === surveyType)
    .sort((a, b) => b.shownAt - a.shownAt)[0];
  
  if (latest) {
    latest.responded = true;
    localStorage.setItem(STORAGE_KEYS.surveyHistory, JSON.stringify(history));
  }
  
  // Track in PostHog
  posthog.capture('survey_responded', {
    survey_type: surveyType,
    ...response,
  });
}

/**
 * Record survey dismissal
 */
export function recordSurveyDismissal(surveyType: string): void {
  const dismissals = getSurveyDismissals();
  
  // Update or add dismissal
  const existing = dismissals.find(d => d.surveyType === surveyType);
  if (existing) {
    existing.dismissedAt = Date.now();
  } else {
    dismissals.push({ surveyType, dismissedAt: Date.now() });
  }
  
  localStorage.setItem(STORAGE_KEYS.surveyDismissals, JSON.stringify(dismissals));
  
  // Track in PostHog
  posthog.capture('survey_dismissed', { survey_type: surveyType });
}

// Survey eligibility checkers for specific use cases

/**
 * Check if NPS survey should be shown
 * Trigger: After successful placement (hired status)
 */
export function shouldShowNPSSurvey(hasRecentPlacement: boolean): boolean {
  if (!hasRecentPlacement) return false;
  return canShowSurvey('nps');
}

/**
 * Check if feature feedback survey should be shown
 * Trigger: After using Club AI 3+ times
 */
export function shouldShowFeatureFeedback(quinnUsageCount: number): boolean {
  if (quinnUsageCount < 3) return false;
  return canShowSurvey('feature_feedback');
}

/**
 * Check if exit survey should be shown
 * Trigger: User inactive for 14+ days returning
 */
export function shouldShowExitSurvey(daysSinceLastActive: number): boolean {
  if (daysSinceLastActive < 14) return false;
  return canShowSurvey('exit_survey');
}

/**
 * Get survey eligibility status for debugging
 */
export function getSurveyEligibility(): {
  canShowAny: boolean;
  monthlyRemaining: number;
  lastSurveyDaysAgo: number | null;
} {
  const history = getSurveyHistory();
  const monthlyData = getMonthlyCount();
  const lastSurvey = history.sort((a, b) => b.shownAt - a.shownAt)[0];
  
  return {
    canShowAny: canShowAnySurvey(),
    monthlyRemaining: SURVEY_CONFIG.maxSurveysPerMonth - monthlyData.count,
    lastSurveyDaysAgo: lastSurvey 
      ? Math.floor((Date.now() - lastSurvey.shownAt) / (1000 * 60 * 60 * 24))
      : null,
  };
}
