import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyzeRequest {
  entity_type?: string;
  entity_id?: string;
  analyze_all?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({})) as AnalyzeRequest;
    const { entity_type, entity_id, analyze_all } = body;

    console.log('[analyze-patterns] Starting pattern analysis');

    let entitiesToAnalyze: Array<{ entity_type: string; entity_id: string }> = [];

    if (entity_type && entity_id) {
      entitiesToAnalyze = [{ entity_type, entity_id }];
    } else if (analyze_all) {
      // Get all unique entities with recent communications
      const { data: entities } = await supabase
        .from('unified_communications')
        .select('entity_type, entity_id')
        .gte('original_timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .limit(100);

      // Deduplicate
      const seen = new Set<string>();
      entitiesToAnalyze = (entities || []).filter(e => {
        const key = `${e.entity_type}:${e.entity_id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    console.log(`[analyze-patterns] Analyzing ${entitiesToAnalyze.length} entities`);

    const patternsDetected: any[] = [];

    for (const entity of entitiesToAnalyze) {
      // Fetch communications for this entity
      const { data: communications } = await supabase
        .from('unified_communications')
        .select('*')
        .eq('entity_type', entity.entity_type)
        .eq('entity_id', entity.entity_id)
        .order('original_timestamp', { ascending: false })
        .limit(50);

      if (!communications || communications.length === 0) continue;

      // Pattern 1: Going Cold Detection
      const lastComm = communications[0];
      const hoursSinceLastComm = (Date.now() - new Date(lastComm.original_timestamp).getTime()) / (1000 * 60 * 60);
      const lastInbound = communications.find(c => c.direction === 'inbound');
      const lastOutbound = communications.find(c => c.direction === 'outbound');

      if (hoursSinceLastComm > 48 && lastOutbound && (!lastInbound || new Date(lastInbound.original_timestamp) < new Date(lastOutbound.original_timestamp))) {
        patternsDetected.push({
          entity_type: entity.entity_type,
          entity_id: entity.entity_id,
          pattern_type: 'going_cold',
          confidence: Math.min(0.95, 0.5 + (hoursSinceLastComm / 96) * 0.45),
          severity: hoursSinceLastComm > 72 ? 'critical' : 'warning',
          details: {
            hours_since_last: Math.round(hoursSinceLastComm),
            last_channel: lastComm.channel,
            awaiting_response_since: lastOutbound?.original_timestamp,
          },
          evidence: {
            last_outbound: lastOutbound?.original_timestamp,
            last_inbound: lastInbound?.original_timestamp,
          },
        });
      }

      // Pattern 2: Channel Preference Detection
      const channelCounts: Record<string, number> = {};
      const inboundByChannel: Record<string, number> = {};
      communications.forEach(c => {
        channelCounts[c.channel] = (channelCounts[c.channel] || 0) + 1;
        if (c.direction === 'inbound') {
          inboundByChannel[c.channel] = (inboundByChannel[c.channel] || 0) + 1;
        }
      });

      const sortedChannels = Object.entries(inboundByChannel).sort((a, b) => b[1] - a[1]);
      if (sortedChannels.length > 0 && sortedChannels[0][1] >= 2) {
        const preferredChannel = sortedChannels[0][0];
        const totalInbound = Object.values(inboundByChannel).reduce((a, b) => a + b, 0);
        const confidence = sortedChannels[0][1] / totalInbound;

        if (confidence > 0.6) {
          patternsDetected.push({
            entity_type: entity.entity_type,
            entity_id: entity.entity_id,
            pattern_type: 'channel_preference',
            confidence,
            severity: 'info',
            details: {
              preferred_channel: preferredChannel,
              channel_breakdown: channelCounts,
            },
          });
        }
      }

      // Pattern 3: Sentiment Shift Detection
      const recentComms = communications.slice(0, 5).filter(c => c.sentiment_score !== null);
      const olderComms = communications.slice(5, 15).filter(c => c.sentiment_score !== null);

      if (recentComms.length >= 2 && olderComms.length >= 2) {
        const recentAvg = recentComms.reduce((a, c) => a + c.sentiment_score, 0) / recentComms.length;
        const olderAvg = olderComms.reduce((a, c) => a + c.sentiment_score, 0) / olderComms.length;
        const shift = recentAvg - olderAvg;

        if (Math.abs(shift) > 0.25) {
          patternsDetected.push({
            entity_type: entity.entity_type,
            entity_id: entity.entity_id,
            pattern_type: 'sentiment_shift',
            confidence: Math.min(0.9, 0.5 + Math.abs(shift)),
            severity: shift < -0.3 ? 'warning' : 'info',
            details: {
              direction: shift > 0 ? 'improving' : 'declining',
              recent_avg_sentiment: recentAvg.toFixed(2),
              previous_avg_sentiment: olderAvg.toFixed(2),
              shift_amount: shift.toFixed(2),
            },
          });
        }
      }

      // Pattern 4: High Engagement Detection
      const last7Days = communications.filter(c => 
        new Date(c.original_timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );
      const inboundLast7Days = last7Days.filter(c => c.direction === 'inbound').length;

      if (inboundLast7Days >= 3) {
        patternsDetected.push({
          entity_type: entity.entity_type,
          entity_id: entity.entity_id,
          pattern_type: 'highly_engaged',
          confidence: Math.min(0.95, 0.5 + inboundLast7Days * 0.1),
          severity: 'info',
          details: {
            inbound_messages_7d: inboundLast7Days,
            total_messages_7d: last7Days.length,
          },
        });
      }

      // Pattern 5: Ready to Convert Detection
      const recentPositive = recentComms.filter(c => c.sentiment_score && c.sentiment_score > 0.3);
      const hasIntentSignals = communications.some(c => 
        c.intent?.toLowerCase().includes('interested') || 
        c.intent?.toLowerCase().includes('ready') ||
        c.intent?.toLowerCase().includes('proceed')
      );

      if (recentPositive.length >= 2 && hasIntentSignals && inboundLast7Days >= 2) {
        patternsDetected.push({
          entity_type: entity.entity_type,
          entity_id: entity.entity_id,
          pattern_type: 'ready_to_convert',
          confidence: 0.85,
          severity: 'info',
          details: {
            positive_signals: recentPositive.length,
            intent_signals: true,
            engagement_level: 'high',
          },
        });
      }
    }

    // Insert detected patterns (upsert to avoid duplicates)
    if (patternsDetected.length > 0) {
      // First, deactivate old patterns for these entities
      for (const pattern of patternsDetected) {
        await supabase
          .from('cross_channel_patterns')
          .update({ is_active: false })
          .eq('entity_type', pattern.entity_type)
          .eq('entity_id', pattern.entity_id)
          .eq('pattern_type', pattern.pattern_type)
          .eq('is_active', true);
      }

      // Insert new patterns
      const { error: insertError } = await supabase
        .from('cross_channel_patterns')
        .insert(patternsDetected);

      if (insertError) {
        console.error('[analyze-patterns] Insert error:', insertError);
      }
    }

    console.log(`[analyze-patterns] Detected ${patternsDetected.length} patterns`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        entities_analyzed: entitiesToAnalyze.length,
        patterns_detected: patternsDetected.length,
        patterns: patternsDetected,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[analyze-patterns] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
