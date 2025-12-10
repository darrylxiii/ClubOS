import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns';

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

      // Fetch prospects
      let prospectQuery = supabase
        .from('crm_prospects')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (options.campaignId) {
        prospectQuery = prospectQuery.eq('campaign_id', options.campaignId);
      }

      if (options.ownerId) {
        prospectQuery = prospectQuery.eq('owner_id', options.ownerId);
      }

      const { data: prospects, error: prospectsError } = await prospectQuery;
      if (prospectsError) throw prospectsError;

      // Fetch campaigns
      const { data: campaigns, error: campaignsError } = await supabase
        .from('crm_campaigns')
        .select('*');
      if (campaignsError) throw campaignsError;

      // Fetch replies
      let repliesQuery = supabase
        .from('crm_email_replies')
        .select('*')
        .gte('received_at', start.toISOString())
        .lte('received_at', end.toISOString());

      const { data: replies, error: repliesError } = await repliesQuery;
      if (repliesError) throw repliesError;

      // Calculate overview
      const allProspects = prospects || [];
      const hotLeads = allProspects.filter(p => p.reply_sentiment === 'hot').length;
      const meetingsBooked = allProspects.filter(p => p.stage === 'meeting_booked').length;
      const closedWon = allProspects.filter(p => p.stage === 'closed_won');
      const totalRevenue = closedWon.reduce((sum, p) => sum + (p.deal_value || 0), 0);
      const dealsWithValue = allProspects.filter(p => p.deal_value && p.deal_value > 0);

      const overview = {
        totalProspects: allProspects.length,
        activeProspects: allProspects.filter(p => !['closed_won', 'closed_lost', 'unsubscribed'].includes(p.stage)).length,
        hotLeads,
        meetingsBooked,
        dealsWon: closedWon.length,
        totalRevenue,
        avgDealSize: dealsWithValue.length > 0
          ? dealsWithValue.reduce((sum, p) => sum + (p.deal_value || 0), 0) / dealsWithValue.length
          : 0,
        conversionRate: allProspects.length > 0
          ? (closedWon.length / allProspects.length) * 100
          : 0,
      };

      // Calculate funnel
      const stages = ['new', 'contacted', 'opened', 'replied', 'qualified', 'meeting_booked', 'proposal_sent', 'negotiation', 'closed_won', 'closed_lost'];
      const funnel = stages.map((stage, index) => {
        const stageProspects = allProspects.filter(p => p.stage === stage);
        const prevStageCount = index > 0
          ? allProspects.filter(p => stages.indexOf(p.stage) >= index - 1).length
          : allProspects.length;
        return {
          stage,
          count: stageProspects.length,
          value: stageProspects.reduce((sum, p) => sum + (p.deal_value || 0), 0),
          conversionRate: prevStageCount > 0 ? (stageProspects.length / prevStageCount) * 100 : 0,
        };
      });

      // Calculate trends
      const days = eachDayOfInterval({ start, end });
      const trends = days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayProspects = allProspects.filter(p => format(new Date(p.created_at), 'yyyy-MM-dd') === dayStr);
        const dayReplies = (replies || []).filter(r => format(new Date(r.received_at), 'yyyy-MM-dd') === dayStr);
        const dayMeetings = dayProspects.filter(p => p.stage === 'meeting_booked');
        const dayDeals = dayProspects.filter(p => p.stage === 'closed_won');
        return {
          date: dayStr,
          prospects: dayProspects.length,
          replies: dayReplies.length,
          meetings: dayMeetings.length,
          deals: dayDeals.length,
        };
      });

      // Campaign performance
      const campaignPerformance = (campaigns || []).map(campaign => ({
        campaignId: campaign.id,
        campaignName: campaign.name,
        sent: campaign.total_sent || 0,
        opened: campaign.total_opens || 0,
        replied: campaign.total_replies || 0,
        openRate: campaign.open_rate || 0,
        replyRate: campaign.reply_rate || 0,
      }));

      // Owner performance (aggregate by owner)
      const ownerMap = new Map<string, { name: string; prospects: number; meetings: number; deals: number; revenue: number }>();
      allProspects.forEach(p => {
        if (p.owner_id) {
          const existing = ownerMap.get(p.owner_id) || { name: 'Unknown', prospects: 0, meetings: 0, deals: 0, revenue: 0 };
          existing.prospects += 1;
          if (p.stage === 'meeting_booked') existing.meetings += 1;
          if (p.stage === 'closed_won') {
            existing.deals += 1;
            existing.revenue += p.deal_value || 0;
          }
          ownerMap.set(p.owner_id, existing);
        }
      });

      const ownerPerformance = Array.from(ownerMap.entries()).map(([ownerId, stats]) => ({
        ownerId,
        ownerName: stats.name,
        prospects: stats.prospects,
        meetings: stats.meetings,
        deals: stats.deals,
        revenue: stats.revenue,
      }));

      // Reply breakdown
      const replyClassifications = (replies || []).reduce((acc, reply) => {
        acc[reply.classification] = (acc[reply.classification] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const totalReplies = (replies || []).length;
      const replyBreakdown = Object.entries(replyClassifications).map(([classification, count]) => ({
        classification,
        count,
        percentage: totalReplies > 0 ? (count / totalReplies) * 100 : 0,
      }));

      setData({
        overview,
        funnel,
        trends,
        campaignPerformance,
        ownerPerformance,
        replyBreakdown,
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

  return {
    data,
    loading,
    error,
    refetch: fetchAnalytics,
  };
}
