import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek } from 'date-fns';

export interface CRMAnalyticsData {
  overview: {
    totalProspects: number;
    activeProspects: number;
    hotLeads: number;
    meetingsBooked: number;
    dealsWon: number;
    totalRevenue: number;
    avgDealSize: number;
    conversionRate: number;
  };
  funnel: {
    stage: string;
    count: number;
    value: number;
    conversionRate: number;
  }[];
  trends: {
    date: string;
    prospects: number;
    replies: number;
    meetings: number;
    deals: number;
  }[];
  campaignPerformance: {
    campaignId: string;
    campaignName: string;
    sent: number;
    opened: number;
    replied: number;
    openRate: number;
    replyRate: number;
  }[];
  ownerPerformance: {
    ownerId: string;
    ownerName: string;
    prospects: number;
    meetings: number;
    deals: number;
    revenue: number;
  }[];
  replyBreakdown: {
    classification: string;
    count: number;
    percentage: number;
  }[];
}

interface UseCRMAnalyticsOptions {
  dateRange?: 'week' | 'month' | '3months' | '6months' | 'year';
  campaignId?: string;
  ownerId?: string;
}

export function useCRMAnalytics(options: UseCRMAnalyticsOptions = {}) {
  const [data, setData] = useState<CRMAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { dateRange = 'month' } = options;

  const getDateRange = useCallback(() => {
    const now = new Date();
    switch (dateRange) {
      case 'week':
        return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case '3months':
        return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
      case '6months':
        return { start: startOfMonth(subMonths(now, 5)), end: endOfMonth(now) };
      case 'year':
        return { start: startOfMonth(subMonths(now, 11)), end: endOfMonth(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }, [dateRange]);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { start, end } = getDateRange();
      const startIso = start.toISOString();
      const endIso = end.toISOString();

      // RPC Calls
      const [
        overviewRes,
        funnelRes,
        trendsRes,
        ownerRes,
        replyRes,
        campaignsRes
      ] = await Promise.all([
        supabase.rpc('get_crm_overview_stats' as any, {
          range_start: startIso,
          range_end: endIso,
          campaign_id_filter: options.campaignId || null,
          owner_id_filter: options.ownerId || null
        }),
        supabase.rpc('get_crm_funnel_stats' as any, {
          range_start: startIso,
          range_end: endIso,
          campaign_id_filter: options.campaignId || null,
          owner_id_filter: options.ownerId || null
        }),
        supabase.rpc('get_crm_daily_trends' as any, {
          range_start: startIso,
          range_end: endIso
        }),
        supabase.rpc('get_crm_owner_stats' as any, {
          range_start: startIso,
          range_end: endIso
        }),
        supabase.rpc('get_crm_reply_stats' as any, {
          range_start: startIso,
          range_end: endIso
        }),
        supabase.from('crm_campaigns').select('*')
      ]);

      if (overviewRes.error) throw overviewRes.error;
      if (funnelRes.error) throw funnelRes.error;
      if (trendsRes.error) throw trendsRes.error;
      if (ownerRes.error) throw ownerRes.error;
      if (replyRes.error) throw replyRes.error;
      if (campaignsRes.error) throw campaignsRes.error;

      // Transform Campaign Performance (Client-side mapping of counters is fine)
      const campaignPerformance = (campaignsRes.data || []).map(campaign => ({
        campaignId: campaign.id,
        campaignName: campaign.name,
        sent: campaign.total_sent || 0,
        opened: campaign.total_opens || 0,
        replied: campaign.total_replies || 0,
        openRate: campaign.open_rate || 0,
        replyRate: campaign.reply_rate || 0,
      }));

      // map owner results
      const ownerPerformance = (ownerRes.data || []).map((o: any) => ({
        ownerId: o.ownerId,
        ownerName: 'Unknown', // RPC doesn't join with users table yet
        prospects: o.prospects,
        meetings: o.meetings,
        deals: o.deals,
        revenue: o.revenue,
      }));

      // map funnel results (calculate simple conversion rate)
      const funnelRaw = (funnelRes.data || []) as any[];
      const funnel = funnelRaw.map((stage: any, index: number) => {
        const prevCount = index > 0 ? funnelRaw[index - 1].count : 0;
        return {
          ...stage,
          conversionRate: prevCount > 0 ? (stage.count / prevCount) * 100 : 0
        };
      });

      setData({
        overview: overviewRes.data as any,
        funnel: funnel,
        trends: trendsRes.data as any,
        ownerPerformance: ownerPerformance,
        replyBreakdown: replyRes.data as any,
        campaignPerformance,
      });

    } catch (err) {
      console.error('Error fetching CRM analytics:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [getDateRange, options.campaignId, options.ownerId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Real-time subscription for live CRM updates
  useEffect(() => {
    const channel = supabase
      .channel('crm-analytics-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crm_prospects' },
        () => {
          // Refetch analytics when prospects change
          fetchAnalytics();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crm_activities' },
        () => {
          // Refetch analytics when activities change
          fetchAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAnalytics]);

  return {
    data,
    loading,
    error,
    refetch: fetchAnalytics,
  };
}
