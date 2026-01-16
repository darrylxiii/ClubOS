import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { subDays } from 'date-fns';

export type ReportDataSource = 'deals' | 'prospects' | 'activities';
export type ReportMetric = 'count' | 'sum_value' | 'avg_score' | 'conversion_rate' | 'avg_value';
export type ReportGroupBy = 'stage' | 'owner' | 'source' | 'campaign' | 'month' | 'week';

export interface ReportDataPoint {
  name: string;
  label: string;
  value: number;
  recordCount?: number;
}

export interface UseCRMReportDataOptions {
  startDate?: Date;
  endDate?: Date;
  ownerId?: string;
  campaignId?: string;
}

/**
 * Hook for fetching CRM report data using server-side aggregation.
 * Uses the get_crm_report_aggregation RPC for performance with large datasets.
 */
export function useCRMReportData(
  dataSource: ReportDataSource,
  groupBy: ReportGroupBy,
  metric: ReportMetric,
  options?: UseCRMReportDataOptions
) {
  const [data, setData] = useState<ReportDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const startDate = options?.startDate || subDays(new Date(), 30);
      const endDate = options?.endDate || new Date();

      // Try to use the server-side RPC first (much more efficient)
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_crm_report_aggregation',
        {
          p_data_source: dataSource,
          p_group_by: groupBy,
          p_metric: metric,
          p_start_date: startDate.toISOString(),
          p_end_date: endDate.toISOString(),
          p_owner_id: options?.ownerId || null,
          p_campaign_id: options?.campaignId || null,
        }
      );

      if (!rpcError && rpcData) {
        // Server-side aggregation succeeded
        const reportData: ReportDataPoint[] = (rpcData as any[]).map((row) => ({
          name: row.group_key,
          label: row.group_label || row.group_key,
          value: Number(row.metric_value) || 0,
          recordCount: Number(row.record_count) || 0,
        }));

        setData(reportData);
        return;
      }

      // Fallback to client-side aggregation if RPC fails
      console.warn('RPC failed, falling back to client-side aggregation:', rpcError);
      await fetchDataClientSide(dataSource, groupBy, metric, startDate, endDate);
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [dataSource, groupBy, metric, options?.startDate, options?.endDate, options?.ownerId, options?.campaignId]);

  // Client-side fallback for when RPC is not available
  const fetchDataClientSide = async (
    dataSource: ReportDataSource,
    groupBy: ReportGroupBy,
    metric: ReportMetric,
    startDate: Date,
    endDate: Date
  ) => {
    let query;

    if (dataSource === 'deals') {
      query = supabase
        .from('crm_prospects')
        .select(`
          id, stage, owner_id, source, created_at, status, score,
          metadata
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
    } else if (dataSource === 'prospects') {
      query = supabase
        .from('crm_prospects')
        .select(`
          id, stage, owner_id, source, created_at, score
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
    } else if (dataSource === 'activities') {
      query = supabase
        .from('crm_activities')
        .select('id, activity_type, user_id, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
    } else {
      setData([]);
      return;
    }

    const { data: rawData, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    // Aggregation logic
    const buckets: Record<string, { values: number[]; count: number }> = {};

    rawData?.forEach((item: any) => {
      let key = 'Unknown';

      switch (groupBy) {
        case 'stage':
          key = item.stage || 'Unassigned';
          break;
        case 'owner':
          key = item.owner_id || item.user_id || 'Unassigned';
          break;
        case 'source':
          key = item.source || 'Direct';
          break;
        case 'campaign':
          key = item.campaign_id || 'No Campaign';
          break;
        case 'month':
          key = new Date(item.created_at).toISOString().slice(0, 7);
          break;
        case 'week': {
          const date = new Date(item.created_at);
          const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
          key = weekStart.toISOString().slice(0, 10);
          break;
        }
      }

      if (!buckets[key]) buckets[key] = { values: [], count: 0 };

      let val = 1;
      if (metric === 'sum_value' || metric === 'avg_value') {
        val = Number(item.metadata?.deal_value) || 0;
      }
      if (metric === 'avg_score') {
        val = item.score || 0;
      }

      buckets[key].values.push(val);
      buckets[key].count++;
    });

    // Calculate final values
    const reportData: ReportDataPoint[] = Object.entries(buckets).map(([key, bucket]) => {
      let calculatedValue = 0;

      switch (metric) {
        case 'count':
          calculatedValue = bucket.count;
          break;
        case 'sum_value':
          calculatedValue = bucket.values.reduce((a, b) => a + b, 0);
          break;
        case 'avg_value':
        case 'avg_score':
          calculatedValue = bucket.values.reduce((a, b) => a + b, 0) / bucket.values.length;
          break;
        case 'conversion_rate':
          // This would need won/lost status to calculate
          calculatedValue = 0;
          break;
      }

      return {
        name: key,
        label: formatGroupLabel(key, groupBy),
        value: Math.round(calculatedValue * 100) / 100,
        recordCount: bucket.count,
      };
    });

    // Sort by value desc for most charts, except time-based groupings
    if (groupBy !== 'month' && groupBy !== 'week') {
      reportData.sort((a, b) => b.value - a.value);
    } else {
      reportData.sort((a, b) => a.name.localeCompare(b.name));
    }

    setData(reportData);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Helper to format group labels nicely
function formatGroupLabel(key: string, groupBy: ReportGroupBy): string {
  switch (groupBy) {
    case 'stage':
      return key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    case 'month': {
      const [year, month] = key.split('-');
      const date = new Date(Number(year), Number(month) - 1);
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    case 'week':
      return `Week of ${new Date(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    default:
      return key;
  }
}

/**
 * Hook for fetching CRM funnel data using server-side RPC.
 */
export function useCRMFunnelData(options?: UseCRMReportDataOptions) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchFunnel = async () => {
      try {
        setLoading(true);
        const startDate = options?.startDate || subDays(new Date(), 30);
        const endDate = options?.endDate || new Date();

        const { data: funnelData, error: funnelError } = await supabase.rpc(
          'get_crm_funnel_data',
          {
            p_start_date: startDate.toISOString(),
            p_end_date: endDate.toISOString(),
            p_owner_id: options?.ownerId || null,
          }
        );

        if (funnelError) throw funnelError;
        setData(funnelData || []);
      } catch (err) {
        console.error('Error fetching funnel data:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchFunnel();
  }, [options?.startDate, options?.endDate, options?.ownerId]);

  return { data, loading, error };
}

/**
 * Hook for fetching CRM time series data.
 */
export function useCRMTimeSeries(
  metric: 'prospects' | 'revenue' | 'deals_won' | 'deals_lost',
  interval: 'day' | 'week' | 'month' = 'day',
  options?: UseCRMReportDataOptions
) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchTimeSeries = async () => {
      try {
        setLoading(true);
        const startDate = options?.startDate || subDays(new Date(), 30);
        const endDate = options?.endDate || new Date();

        const { data: tsData, error: tsError } = await supabase.rpc('get_crm_time_series', {
          p_metric: metric,
          p_interval: interval,
          p_start_date: startDate.toISOString(),
          p_end_date: endDate.toISOString(),
        });

        if (tsError) throw tsError;
        setData(tsData || []);
      } catch (err) {
        console.error('Error fetching time series data:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchTimeSeries();
  }, [metric, interval, options?.startDate, options?.endDate]);

  return { data, loading, error };
}
