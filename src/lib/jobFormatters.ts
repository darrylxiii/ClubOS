/**
 * Shared job formatting utilities
 * Centralizes common formatting logic used across job cards and dashboards
 */

export const formatSalary = (
  min?: number | null,
  max?: number | null,
  currency: string = 'EUR'
): string | null => {
  if (!max && !min) return null;
  
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  });
  
  if (min && max) {
    return `${formatter.format(min)} - ${formatter.format(max)}`;
  }
  if (max) {
    return `Up to ${formatter.format(max)}`;
  }
  if (min) {
    return `From ${formatter.format(min)}`;
  }
  return null;
};

export const formatSalaryCompact = (
  min?: number | null,
  max?: number | null,
  currency: string = 'EUR'
): string | null => {
  if (!max && !min) return null;
  
  const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency === 'GBP' ? '£' : currency;
  
  const formatK = (num: number) => {
    if (num >= 1000) {
      return `${Math.round(num / 1000)}k`;
    }
    return num.toString();
  };
  
  if (min && max) {
    return `${symbol}${formatK(min)}-${formatK(max)}`;
  }
  if (max) {
    return `Up to ${symbol}${formatK(max)}`;
  }
  if (min) {
    return `From ${symbol}${formatK(min)}`;
  }
  return null;
};

export const formatDaysAgo = (date: string | Date): string => {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
};

export const formatEmploymentType = (type?: string | null): string => {
  const types: Record<string, string> = {
    fulltime: 'Full-time',
    parttime: 'Part-time',
    contract: 'Contract',
    freelance: 'Freelance',
    internship: 'Internship',
    temporary: 'Temporary',
  };
  return types[type || ''] || type || 'Full-time';
};

export const formatLocationType = (type?: string | null): string => {
  const types: Record<string, string> = {
    remote: 'Remote',
    hybrid: 'Hybrid',
    onsite: 'On-site',
    'on-site': 'On-site',
  };
  return types[type?.toLowerCase() || ''] || type || 'On-site';
};

export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low' | 'none';

export interface UrgencyInfo {
  level: UrgencyLevel;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const getUrgencyLevel = (
  daysOpen: number,
  lastActivityDaysAgo: number,
  applicantsCount: number = 0
): UrgencyInfo => {
  // Critical: Stale job with no recent activity
  if (daysOpen > 30 && lastActivityDaysAgo > 14 && applicantsCount < 5) {
    return {
      level: 'critical',
      label: 'Needs Attention',
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
    };
  }
  
  // High: Open for a while with low activity
  if (daysOpen > 21 && lastActivityDaysAgo > 7) {
    return {
      level: 'high',
      label: 'Low Activity',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
    };
  }
  
  // Medium: Moderately stale
  if (daysOpen > 14 && lastActivityDaysAgo > 5) {
    return {
      level: 'medium',
      label: 'Check Pipeline',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
    };
  }
  
  // Low: New job or recently active
  if (daysOpen <= 7) {
    return {
      level: 'low',
      label: 'New',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
    };
  }
  
  // None: Normal state
  return {
    level: 'none',
    label: '',
    color: '',
    bgColor: '',
    borderColor: '',
  };
};

export const getConversionColor = (rate: number): string => {
  if (rate >= 50) return 'text-green-500';
  if (rate >= 30) return 'text-yellow-500';
  if (rate >= 15) return 'text-orange-500';
  return 'text-red-500';
};

export const getConversionBgColor = (rate: number): string => {
  if (rate >= 50) return 'bg-green-500/10';
  if (rate >= 30) return 'bg-yellow-500/10';
  if (rate >= 15) return 'bg-orange-500/10';
  return 'bg-red-500/10';
};
