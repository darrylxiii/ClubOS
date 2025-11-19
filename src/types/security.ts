export interface RLSMetrics {
  totalPolicies: number;
  tablesWithRLS: number;
  totalTables: number;
  coveragePercentage: number;
  topTables: Array<{ tablename: string; policy_count: number }>;
}

export interface AuthMetrics {
  totalFailures: number;
  uniqueIPs: number;
  hourlyBreakdown: Array<{ hour: string; failure_count: number }>;
  topIPs: Array<{ ip: string; failure_count: number }>;
}

export interface RateLimitMetrics {
  totalRejections: number;
  byEndpoint: Record<string, number>;
  topIPs: Array<{ ip: string; hit_count: number }>;
}

export interface StorageMetrics {
  totalBuckets: number;
  publicBuckets: number;
  privateBuckets: number;
  withSizeLimits: number;
  withMimeRestrictions: number;
}

export interface SecurityMetricsHistory {
  id: string;
  metric_date: string;
  total_tables: number;
  tables_with_rls: number;
  total_rls_policies: number;
  failed_auth_attempts: number;
  rate_limit_rejections: number;
  total_buckets: number;
  public_buckets: number;
  created_at: string;
}

export interface SecurityAlert {
  id: string;
  alert_type: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  metadata: Record<string, any>;
  is_dismissed: boolean;
  dismissed_at?: string;
  dismissed_by?: string;
  created_at: string;
  updated_at: string;
}
