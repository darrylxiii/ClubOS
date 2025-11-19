/**
 * Shared TypeScript interfaces for admin dashboard components
 */

import { LucideIcon } from "lucide-react";

export interface BaseMetric {
  value: number | string;
  label: string;
  change?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
}

export interface MetricCardData {
  title: string;
  description?: string;
  icon: LucideIcon;
  iconColor?: 'success' | 'warning' | 'critical' | 'info' | 'neutral';
  primaryMetric: string | number;
  secondaryText?: string;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
}

export interface TopItem {
  id: string;
  name: string;
  count: number;
  percentage?: number;
}

export interface TrendDataPoint {
  date: string;
  [key: string]: string | number;
}

export interface DashboardAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
}

export interface ChartConfig {
  dataKey: string;
  name: string;
  color: string;
  type?: 'line' | 'area' | 'bar';
}

// Common filter types
export interface DateRangeFilter {
  from: Date;
  to: Date;
}

export interface StatusFilter {
  status: string[];
}

// Common response types for RPC functions
export interface MetricsResponse<T = any> {
  data: T;
  timestamp: string;
  success: boolean;
}

// Loading states
export interface LoadingState {
  isLoading: boolean;
  error: Error | null;
}
