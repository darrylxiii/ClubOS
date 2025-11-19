/**
 * Standardized color system for admin dashboard components
 * Uses semantic tokens from the design system
 */

export const statusColors = {
  success: {
    border: 'border-green-500/20',
    bg: 'bg-green-500/10',
    text: 'text-green-500',
    icon: 'text-green-500',
  },
  warning: {
    border: 'border-orange-500/20',
    bg: 'bg-orange-500/10',
    text: 'text-orange-500',
    icon: 'text-orange-500',
  },
  critical: {
    border: 'border-destructive/20',
    bg: 'bg-destructive/10',
    text: 'text-destructive',
    icon: 'text-destructive',
  },
  info: {
    border: 'border-blue-500/20',
    bg: 'bg-blue-500/10',
    text: 'text-blue-500',
    icon: 'text-blue-500',
  },
  neutral: {
    border: 'border-border/20',
    bg: 'bg-muted/50',
    text: 'text-muted-foreground',
    icon: 'text-muted-foreground',
  },
} as const;

export type StatusColorKey = keyof typeof statusColors;

/**
 * Chart colors for trend visualizations
 * Optimized for light and dark mode readability
 */
export const chartColors = {
  primary: '#3b82f6',    // blue-500
  secondary: '#8b5cf6',  // violet-500
  success: '#22c55e',    // green-500
  warning: '#f97316',    // orange-500
  danger: '#ef4444',     // red-500
  info: '#06b6d4',       // cyan-500
  purple: '#a855f7',     // purple-500
  pink: '#ec4899',       // pink-500
} as const;

/**
 * Helper to determine status color based on threshold
 */
export const getStatusColor = (
  value: number,
  thresholds: { success: number; warning: number }
): StatusColorKey => {
  if (value >= thresholds.success) return 'success';
  if (value >= thresholds.warning) return 'warning';
  return 'critical';
};

/**
 * Helper to format percentage values with appropriate color
 */
export const getPercentageStatus = (percentage: number): StatusColorKey => {
  if (percentage >= 90) return 'success';
  if (percentage >= 70) return 'warning';
  return 'critical';
};
