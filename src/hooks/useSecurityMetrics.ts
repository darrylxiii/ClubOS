import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RLSMetrics, AuthMetrics, RateLimitMetrics, StorageMetrics } from "@/types/security";

export const useSecurityMetrics = () => {
  // RLS Policies
  const { data: rlsMetrics, isLoading: rlsLoading } = useQuery({
    queryKey: ['security-rls-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_rls_policy_count');
      if (error) throw error;
      
      const jsonData = data as any;
      const result: RLSMetrics = {
        totalPolicies: jsonData?.total_policies || 0,
        tablesWithRLS: jsonData?.tables_with_rls || 0,
        totalTables: jsonData?.total_tables || 0,
        coveragePercentage: jsonData?.total_tables > 0 
          ? Math.round((jsonData.tables_with_rls / jsonData.total_tables) * 100)
          : 0,
        topTables: jsonData?.top_tables || []
      };
      
      return result;
    },
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
    staleTime: 30000,
  });

  // Auth Failures (last 24h)
  const { data: authMetrics, isLoading: authLoading } = useQuery({
    queryKey: ['security-auth-failures'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_auth_failure_stats', { hours_back: 24 });
      if (error) throw error;
      
      const jsonData = data as any;
      const result: AuthMetrics = {
        totalFailures: jsonData?.total_failures || 0,
        uniqueIPs: jsonData?.unique_ips || 0,
        hourlyBreakdown: jsonData?.hourly_breakdown || [],
        topIPs: jsonData?.top_ips || []
      };
      
      return result;
    },
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    staleTime: 15000,
  });

  // Rate Limiting Stats
  const { data: rateLimitMetrics, isLoading: rateLimitLoading } = useQuery({
    queryKey: ['security-rate-limits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_rate_limits')
        .select('endpoint, request_count, ip_address')
        .gte('window_start', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      
      if (error) throw error;
      
      // Aggregate by endpoint
      const byEndpoint: Record<string, number> = {};
      const ipCounts: Record<string, number> = {};
      
      data?.forEach(item => {
        byEndpoint[item.endpoint] = (byEndpoint[item.endpoint] || 0) + 1;
        ipCounts[item.ip_address] = (ipCounts[item.ip_address] || 0) + 1;
      });
      
      const topIPs = Object.entries(ipCounts)
        .map(([ip, hit_count]) => ({ ip, hit_count }))
        .sort((a, b) => b.hit_count - a.hit_count)
        .slice(0, 10);
      
      const result: RateLimitMetrics = {
        totalRejections: data?.length || 0,
        byEndpoint,
        topIPs
      };
      
      return result;
    },
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
    staleTime: 30000,
  });

  // Storage Buckets
  const { data: storageMetrics, isLoading: storageLoading } = useQuery({
    queryKey: ['security-storage-buckets'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_storage_bucket_stats');
      if (error) throw error;
      
      const jsonData = data as any;
      const result: StorageMetrics = {
        totalBuckets: jsonData?.total_buckets || 0,
        publicBuckets: jsonData?.public_buckets || 0,
        privateBuckets: jsonData?.private_buckets || 0,
        withSizeLimits: jsonData?.with_size_limits || 0,
        withMimeRestrictions: jsonData?.with_mime_restrictions || 0
      };
      
      return result;
    },
    refetchInterval: 300000,
    refetchIntervalInBackground: false,
    staleTime: 150000,
  });

  return {
    rlsMetrics,
    authMetrics,
    rateLimitMetrics,
    storageMetrics,
    isLoading: rlsLoading || authLoading || rateLimitLoading || storageLoading
  };
};
