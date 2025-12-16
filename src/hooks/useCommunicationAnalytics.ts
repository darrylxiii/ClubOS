import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AnalyticsSummary {
  total_communications: number;
  outbound: number;
  inbound: number;
  unique_contacts: number;
  avg_response_time_hours: number;
  overall_response_rate: number;
}

interface ChannelBreakdown {
  email: number;
  whatsapp: number;
  meeting: number;
  phone: number;
}

interface ChannelResponseRate {
  channel: string;
  sent: number;
  replied: number;
  response_rate: number;
}

interface DailyActivity {
  date: string;
  sent: number;
  received: number;
}

interface SentimentTrend {
  date: string;
  avg_sentiment: number;
}

interface TeamMemberPerformance {
  owner_id: string;
  total_communications: number;
  response_rate: number;
  avg_sentiment: number;
}

interface RevenueAttribution {
  total_placements: number;
  attributed_to_communication: number;
}

interface CommunicationAnalytics {
  summary: AnalyticsSummary;
  channel_breakdown: ChannelBreakdown;
  channel_response_rates: ChannelResponseRate[];
  daily_activity: DailyActivity[];
  sentiment_trend: SentimentTrend[];
  team_performance: TeamMemberPerformance[];
  revenue_attribution: RevenueAttribution;
  peak_hours: number[];
  generated_at: string;
}

export function useCommunicationAnalytics() {
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<CommunicationAnalytics | null>(null);
  const { toast } = useToast();

  const fetchAnalytics = useCallback(async (options?: {
    user_id?: string;
    company_id?: string;
    date_range?: { start: string; end: string };
  }) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('communication-analytics', {
        body: options || {}
      });

      if (error) throw error;

      setAnalytics(data);
      return data;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analytics';
      toast({ title: 'Analytics failed', description: errorMessage, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    loading,
    analytics,
    fetchAnalytics,
  };
}
