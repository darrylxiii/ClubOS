import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QueryRequest {
  query_type: 'at_risk_relationships' | 'hot_leads' | 'follow_up_needed' | 'engagement_summary' | 'channel_performance' | 'entity_timeline' | 'pattern_alerts';
  filters?: {
    entity_type?: string;
    time_range_days?: number;
    risk_level?: string;
    channel?: string;
    owner_id?: string;
  };
  entity_id?: string;
  limit?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { query_type, filters = {}, entity_id, limit = 20 } = await req.json() as QueryRequest;

    console.log(`[comm-intelligence-query] Query type: ${query_type}`);

    let result: any = null;

    switch (query_type) {
      case 'at_risk_relationships': {
        let query = supabase
          .from('communication_relationship_scores')
          .select('*')
          .in('risk_level', ['high', 'critical'])
          .order('health_score', { ascending: true })
          .limit(limit);

        if (filters.entity_type) {
          query = query.eq('entity_type', filters.entity_type);
        }
        if (filters.owner_id) {
          query = query.eq('owner_id', filters.owner_id);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Enrich with entity names
        const enrichedData = await enrichWithEntityNames(supabase, data);
        result = enrichedData;
        break;
      }

      case 'hot_leads': {
        // Find entities with ready_to_convert or highly_engaged patterns
        const { data: patterns, error } = await supabase
          .from('cross_channel_patterns')
          .select('*')
          .in('pattern_type', ['ready_to_convert', 'highly_engaged'])
          .eq('is_active', true)
          .gte('confidence', 0.7)
          .order('detected_at', { ascending: false })
          .limit(limit);

        if (error) throw error;

        const enrichedData = await enrichWithEntityNames(supabase, patterns);
        result = enrichedData;
        break;
      }

      case 'follow_up_needed': {
        // Find entities with no recent outbound and going_cold patterns
        const { data: relationships, error } = await supabase
          .from('communication_relationship_scores')
          .select('*')
          .or('days_since_contact.gte.2,risk_level.eq.medium,risk_level.eq.high')
          .order('days_since_contact', { ascending: false })
          .limit(limit);

        if (error) throw error;

        const enrichedData = await enrichWithEntityNames(supabase, relationships);
        result = enrichedData;
        break;
      }

      case 'engagement_summary': {
        const timeRangeDays = filters.time_range_days || 7;
        const since = new Date(Date.now() - timeRangeDays * 24 * 60 * 60 * 1000).toISOString();

        // Aggregate communications stats
        const { data: comms, error } = await supabase
          .from('unified_communications')
          .select('channel, direction, sentiment_score')
          .gte('original_timestamp', since);

        if (error) throw error;

        const summary = {
          total_communications: comms?.length || 0,
          by_channel: {} as Record<string, { total: number; inbound: number; outbound: number }>,
          by_direction: { inbound: 0, outbound: 0, mutual: 0 },
          avg_sentiment: 0,
          positive_count: 0,
          negative_count: 0,
          neutral_count: 0,
        };

        let sentimentSum = 0;
        let sentimentCount = 0;

        comms?.forEach(c => {
          // By channel
          if (!summary.by_channel[c.channel]) {
            summary.by_channel[c.channel] = { total: 0, inbound: 0, outbound: 0 };
          }
          summary.by_channel[c.channel].total++;
          if (c.direction === 'inbound') summary.by_channel[c.channel].inbound++;
          if (c.direction === 'outbound') summary.by_channel[c.channel].outbound++;

          // By direction
          if (c.direction === 'inbound') summary.by_direction.inbound++;
          else if (c.direction === 'outbound') summary.by_direction.outbound++;
          else summary.by_direction.mutual++;

          // Sentiment
          if (c.sentiment_score !== null) {
            sentimentSum += c.sentiment_score;
            sentimentCount++;
            if (c.sentiment_score > 0.2) summary.positive_count++;
            else if (c.sentiment_score < -0.2) summary.negative_count++;
            else summary.neutral_count++;
          }
        });

        summary.avg_sentiment = sentimentCount > 0 ? sentimentSum / sentimentCount : 0;

        result = summary;
        break;
      }

      case 'channel_performance': {
        const timeRangeDays = filters.time_range_days || 30;
        const since = new Date(Date.now() - timeRangeDays * 24 * 60 * 60 * 1000).toISOString();

        const { data: comms, error } = await supabase
          .from('unified_communications')
          .select('channel, direction, sentiment_score, response_time_seconds')
          .gte('original_timestamp', since);

        if (error) throw error;

        const channelStats: Record<string, any> = {};

        comms?.forEach(c => {
          if (!channelStats[c.channel]) {
            channelStats[c.channel] = {
              total: 0,
              inbound: 0,
              outbound: 0,
              sentiment_sum: 0,
              sentiment_count: 0,
              response_times: [],
            };
          }

          channelStats[c.channel].total++;
          if (c.direction === 'inbound') channelStats[c.channel].inbound++;
          if (c.direction === 'outbound') channelStats[c.channel].outbound++;

          if (c.sentiment_score !== null) {
            channelStats[c.channel].sentiment_sum += c.sentiment_score;
            channelStats[c.channel].sentiment_count++;
          }

          if (c.response_time_seconds) {
            channelStats[c.channel].response_times.push(c.response_time_seconds);
          }
        });

        // Calculate averages
        const performance = Object.entries(channelStats).map(([channel, stats]: [string, any]) => ({
          channel,
          total_messages: stats.total,
          inbound_messages: stats.inbound,
          outbound_messages: stats.outbound,
          response_rate: stats.total > 0 ? (stats.inbound / stats.total * 100).toFixed(1) + '%' : '0%',
          avg_sentiment: stats.sentiment_count > 0 ? (stats.sentiment_sum / stats.sentiment_count).toFixed(2) : null,
          avg_response_time_hours: stats.response_times.length > 0 
            ? (stats.response_times.reduce((a: number, b: number) => a + b, 0) / stats.response_times.length / 3600).toFixed(1)
            : null,
        }));

        result = performance;
        break;
      }

      case 'entity_timeline': {
        if (!entity_id) {
          throw new Error('entity_id required for entity_timeline query');
        }

        const { data: comms, error } = await supabase
          .from('unified_communications')
          .select('*')
          .eq('entity_id', entity_id)
          .order('original_timestamp', { ascending: false })
          .limit(limit);

        if (error) throw error;

        result = comms;
        break;
      }

      case 'pattern_alerts': {
        let query = supabase
          .from('cross_channel_patterns')
          .select('*')
          .eq('is_active', true)
          .order('detected_at', { ascending: false })
          .limit(limit);

        if (filters.entity_type) {
          query = query.eq('entity_type', filters.entity_type);
        }

        const { data, error } = await query;
        if (error) throw error;

        const enrichedData = await enrichWithEntityNames(supabase, data);
        result = enrichedData;
        break;
      }

      default:
        throw new Error(`Unknown query type: ${query_type}`);
    }

    console.log(`[comm-intelligence-query] Returning ${Array.isArray(result) ? result.length : 1} results`);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[comm-intelligence-query] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function enrichWithEntityNames(supabase: any, data: any[]): Promise<any[]> {
  if (!data || data.length === 0) return [];

  const candidateIds = data.filter(d => d.entity_type === 'candidate').map(d => d.entity_id);
  const prospectIds = data.filter(d => d.entity_type === 'prospect').map(d => d.entity_id);

  const entityNames: Record<string, string> = {};

  if (candidateIds.length > 0) {
    const { data: candidates } = await supabase
      .from('candidate_profiles')
      .select('id, full_name')
      .in('id', candidateIds);

    candidates?.forEach((c: any) => {
      entityNames[c.id] = c.full_name;
    });
  }

  if (prospectIds.length > 0) {
    const { data: prospects } = await supabase
      .from('crm_prospects')
      .select('id, contact_name, company_name')
      .in('id', prospectIds);

    prospects?.forEach((p: any) => {
      entityNames[p.id] = p.contact_name || p.company_name;
    });
  }

  return data.map(d => ({
    ...d,
    entity_name: entityNames[d.entity_id] || 'Unknown',
  }));
}
