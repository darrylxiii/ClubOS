import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { publicCorsHeaders as corsHeaders } from '../_shared/cors-config.ts';

interface AnalyticsInput {
  user_id?: string;
  company_id?: string;
  date_range?: {
    start: string;
    end: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle empty body gracefully
    let input: AnalyticsInput = {};
    try {
      const body = await req.text();
      if (body && body.trim()) {
        input = JSON.parse(body);
      }
    } catch (parseError) {
      console.log('[communication-analytics] No body or invalid JSON, using defaults');
    }

    const { user_id, company_id, date_range } = input;

    console.log('[communication-analytics] Generating analytics', { user_id, company_id, date_range });

    const startDate = date_range?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = date_range?.end || new Date().toISOString();

    // Fetch communications
    let query = supabase
      .from('unified_communications')
      .select('*')
      .gte('communication_date', startDate)
      .lte('communication_date', endDate);

    if (user_id) {
      query = query.eq('owner_id', user_id);
    }

    const { data: communications, error: commError } = await query;
    if (commError) throw commError;

    const comms = communications || [];

    // Channel breakdown
    const channelBreakdown = {
      email: comms.filter(c => c.channel === 'email').length,
      whatsapp: comms.filter(c => c.channel === 'whatsapp').length,
      meeting: comms.filter(c => c.channel === 'meeting').length,
      phone: comms.filter(c => c.channel === 'phone').length,
    };

    // Response time analysis
    const responseTimes: number[] = [];
    const sortedComms = [...comms].sort((a, b) => 
      new Date(a.communication_date).getTime() - new Date(b.communication_date).getTime()
    );
    
    for (let i = 1; i < sortedComms.length; i++) {
      if (sortedComms[i].direction !== sortedComms[i-1].direction && 
          sortedComms[i].entity_id === sortedComms[i-1].entity_id) {
        const diff = new Date(sortedComms[i].communication_date).getTime() - 
                     new Date(sortedComms[i-1].communication_date).getTime();
        responseTimes.push(diff / (1000 * 60 * 60)); // hours
      }
    }

    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;

    // Daily activity
    const dailyActivity: Record<string, { sent: number; received: number }> = {};
    comms.forEach(c => {
      const date = new Date(c.communication_date).toISOString().split('T')[0];
      if (!dailyActivity[date]) {
        dailyActivity[date] = { sent: 0, received: 0 };
      }
      if (c.direction === 'outbound') {
        dailyActivity[date].sent++;
      } else {
        dailyActivity[date].received++;
      }
    });

    // Sentiment trends
    const sentimentTrendMap: Record<string, { total: number; count: number }> = {};
    comms
      .filter(c => c.sentiment_score !== null)
      .forEach(c => {
        const date = new Date(c.communication_date).toISOString().split('T')[0];
        if (!sentimentTrendMap[date]) {
          sentimentTrendMap[date] = { total: 0, count: 0 };
        }
        sentimentTrendMap[date].total += c.sentiment_score || 0;
        sentimentTrendMap[date].count++;
      });

    // Response rate by channel
    const channelResponseRates: Record<string, { sent: number; replied: number }> = {};
    comms.forEach(c => {
      if (!channelResponseRates[c.channel]) {
        channelResponseRates[c.channel] = { sent: 0, replied: 0 };
      }
      if (c.direction === 'outbound') {
        channelResponseRates[c.channel].sent++;
      } else {
        channelResponseRates[c.channel].replied++;
      }
    });

    // Team performance (if company-level)
    let teamPerformance: any[] = [];
    if (company_id) {
      const ownerStats: Record<string, { total: number; responded: number; avgSentiment: number[] }> = {};
      comms.forEach(c => {
        if (!c.owner_id) return;
        if (!ownerStats[c.owner_id]) {
          ownerStats[c.owner_id] = { total: 0, responded: 0, avgSentiment: [] };
        }
        ownerStats[c.owner_id].total++;
        if (c.direction === 'inbound') {
          ownerStats[c.owner_id].responded++;
        }
        if (c.sentiment_score) {
          ownerStats[c.owner_id].avgSentiment.push(c.sentiment_score);
        }
      });

      teamPerformance = Object.entries(ownerStats).map(([ownerId, stats]) => ({
        owner_id: ownerId,
        total_communications: stats.total,
        response_rate: stats.total > 0 ? (stats.responded / stats.total) * 100 : 0,
        avg_sentiment: stats.avgSentiment.length > 0 
          ? stats.avgSentiment.reduce((a, b) => a + b, 0) / stats.avgSentiment.length 
          : 0.5,
      }));
    }

    // Revenue attribution (fetch placements linked to communications)
    const entityIds = [...new Set(comms.map(c => c.entity_id))];
    const { data: placements } = await supabase
      .from('applications')
      .select('id, candidate_id, job_id, status, match_score')
      .in('candidate_id', entityIds)
      .eq('status', 'hired');

    const revenueAttribution = {
      total_placements: placements?.length || 0,
      attributed_to_communication: placements?.filter(p => 
        comms.some(c => c.entity_id === p.candidate_id)
      ).length || 0,
    };

    // Peak activity hours
    const hourlyActivity: Record<number, number> = {};
    comms.forEach(c => {
      const hour = new Date(c.communication_date).getHours();
      hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
    });

    const peakHours = Object.entries(hourlyActivity)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    const analytics = {
      summary: {
        total_communications: comms.length,
        outbound: comms.filter(c => c.direction === 'outbound').length,
        inbound: comms.filter(c => c.direction === 'inbound').length,
        unique_contacts: entityIds.length,
        avg_response_time_hours: Math.round(avgResponseTime * 10) / 10,
        overall_response_rate: comms.filter(c => c.direction === 'outbound').length > 0 
          ? Math.round((comms.filter(c => c.direction === 'inbound').length / 
                       comms.filter(c => c.direction === 'outbound').length) * 100) 
          : 0,
      },
      channel_breakdown: channelBreakdown,
      channel_response_rates: Object.entries(channelResponseRates).map(([channel, stats]) => ({
        channel,
        sent: stats.sent,
        replied: stats.replied,
        response_rate: stats.sent > 0 ? Math.round((stats.replied / stats.sent) * 100) : 0,
      })),
      daily_activity: Object.entries(dailyActivity).map(([date, stats]) => ({
        date,
        ...stats,
      })).sort((a, b) => a.date.localeCompare(b.date)),
      sentiment_trend: Object.entries(sentimentTrendMap).map(([date, stats]) => ({
        date,
        avg_sentiment: Math.round((stats.total / stats.count) * 100) / 100,
      })).sort((a, b) => a.date.localeCompare(b.date)),
      team_performance: teamPerformance,
      revenue_attribution: revenueAttribution,
      peak_hours: peakHours,
      generated_at: new Date().toISOString(),
    };

    console.log(`[communication-analytics] Generated analytics: ${comms.length} communications analyzed`);

    return new Response(JSON.stringify(analytics), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[communication-analytics] Error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
