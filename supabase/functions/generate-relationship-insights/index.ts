import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InsightsRequest {
  entity_type: string;
  entity_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { entity_type, entity_id } = await req.json() as InsightsRequest;

    console.log(`[relationship-insights] Generating insights for ${entity_type}:${entity_id}`);

    // Fetch all communications
    const { data: communications } = await supabase
      .from('unified_communications')
      .select('*')
      .eq('entity_type', entity_type)
      .eq('entity_id', entity_id)
      .order('original_timestamp', { ascending: false })
      .limit(100);

    // Fetch patterns
    const { data: patterns } = await supabase
      .from('cross_channel_patterns')
      .select('*')
      .eq('entity_type', entity_type)
      .eq('entity_id', entity_id)
      .eq('is_active', true);

    // Fetch entity details based on type
    let entityName = 'Unknown';
    let entityDetails: any = {};

    if (entity_type === 'candidate') {
      const { data: candidate } = await supabase
        .from('candidate_profiles')
        .select('full_name, current_title, current_company')
        .eq('id', entity_id)
        .single();
      if (candidate) {
        entityName = candidate.full_name || 'Unknown';
        entityDetails = candidate;
      }
    } else if (entity_type === 'prospect') {
      const { data: prospect } = await supabase
        .from('crm_prospects')
        .select('company_name, contact_name, stage')
        .eq('id', entity_id)
        .single();
      if (prospect) {
        entityName = prospect.contact_name || prospect.company_name || 'Unknown';
        entityDetails = prospect;
      }
    }

    // Calculate metrics
    const totalComms = communications?.length || 0;
    const inboundCount = communications?.filter(c => c.direction === 'inbound').length || 0;
    const outboundCount = communications?.filter(c => c.direction === 'outbound').length || 0;
    
    const withSentiment = communications?.filter(c => c.sentiment_score !== null) || [];
    const avgSentiment = withSentiment.length > 0 
      ? withSentiment.reduce((a, c) => a + c.sentiment_score, 0) / withSentiment.length 
      : 0;

    // Channel breakdown
    const channelBreakdown: Record<string, number> = {};
    communications?.forEach(c => {
      channelBreakdown[c.channel] = (channelBreakdown[c.channel] || 0) + 1;
    });

    // Response time calculation
    let avgResponseTimeHours: number | null = null;
    const responseTimes: number[] = [];
    for (let i = 0; i < (communications?.length || 0) - 1; i++) {
      const curr = communications![i];
      const prev = communications![i + 1];
      if (curr.direction === 'inbound' && prev.direction === 'outbound') {
        const hours = (new Date(curr.original_timestamp).getTime() - new Date(prev.original_timestamp).getTime()) / (1000 * 60 * 60);
        if (hours > 0 && hours < 168) { // Max 1 week
          responseTimes.push(hours);
        }
      }
    }
    if (responseTimes.length > 0) {
      avgResponseTimeHours = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    }

    // Determine risk level
    let riskLevel = 'low';
    let riskFactors: string[] = [];
    const lastComm = communications?.[0];
    const hoursSinceContact = lastComm 
      ? (Date.now() - new Date(lastComm.original_timestamp).getTime()) / (1000 * 60 * 60)
      : 999;

    if (hoursSinceContact > 72) {
      riskLevel = 'high';
      riskFactors.push('No contact in 3+ days');
    } else if (hoursSinceContact > 48) {
      riskLevel = 'medium';
      riskFactors.push('No contact in 2+ days');
    }

    if (avgSentiment < -0.2) {
      riskLevel = riskLevel === 'low' ? 'medium' : 'high';
      riskFactors.push('Negative sentiment trend');
    }

    const goingColdPattern = patterns?.find(p => p.pattern_type === 'going_cold');
    if (goingColdPattern) {
      riskLevel = 'critical';
      riskFactors.push('Going cold pattern detected');
    }

    // Determine health score (0-100)
    let healthScore = 100;
    healthScore -= Math.min(30, hoursSinceContact / 2.4); // Max -30 for no contact
    healthScore -= Math.min(20, (avgSentiment < 0 ? Math.abs(avgSentiment) * 40 : 0)); // Max -20 for sentiment
    healthScore -= Math.min(20, outboundCount > inboundCount * 3 ? 20 : 0); // -20 if one-sided
    healthScore += Math.min(10, inboundCount * 2); // Bonus for engagement
    healthScore = Math.max(0, Math.min(100, healthScore));

    // Recommended action
    let recommendedAction = '';
    let recommendedChannel = lastComm?.channel || 'email';

    if (riskLevel === 'critical' || riskLevel === 'high') {
      recommendedAction = 'Urgent follow-up required - consider phone call';
      recommendedChannel = 'phone';
    } else if (hoursSinceContact > 24) {
      recommendedAction = 'Send a friendly check-in message';
      const preferredChannelPattern = patterns?.find(p => p.pattern_type === 'channel_preference');
      if (preferredChannelPattern) {
        recommendedChannel = preferredChannelPattern.details?.preferred_channel || recommendedChannel;
      }
    } else if (avgSentiment > 0.3 && inboundCount >= 2) {
      recommendedAction = 'Strong engagement - consider scheduling a call';
      recommendedChannel = 'meeting';
    } else {
      recommendedAction = 'Maintain regular communication';
    }

    // Generate AI summary if OpenAI key available
    let relationshipSummary = '';
    if (openaiKey && communications && communications.length > 0) {
      try {
        const commSummaries = communications.slice(0, 10).map(c => 
          `[${c.channel}] ${c.direction}: ${c.content_preview?.substring(0, 100) || c.subject || 'No content'}`
        ).join('\n');

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are a relationship intelligence analyst. Summarize the communication history in 2-3 sentences, highlighting key topics, sentiment, and relationship status. Be concise and actionable.',
              },
              {
                role: 'user',
                content: `Entity: ${entityName}\nType: ${entity_type}\nRecent communications:\n${commSummaries}\n\nAvg Sentiment: ${avgSentiment.toFixed(2)}\nRisk Level: ${riskLevel}\n\nProvide a brief relationship summary.`,
              },
            ],
            max_tokens: 150,
            temperature: 0.7,
          }),
        });

        const aiResult = await response.json();
        relationshipSummary = aiResult.choices?.[0]?.message?.content || '';
      } catch (aiError) {
        console.error('[relationship-insights] AI summary error:', aiError);
        relationshipSummary = `${totalComms} interactions via ${Object.keys(channelBreakdown).join(', ')}. ${riskLevel === 'low' ? 'Healthy relationship.' : `Attention needed: ${riskFactors.join(', ')}`}`;
      }
    } else {
      relationshipSummary = `${totalComms} interactions via ${Object.keys(channelBreakdown).join(', ')}. ${riskLevel === 'low' ? 'Healthy relationship.' : `Attention needed: ${riskFactors.join(', ')}`}`;
    }

    // Update relationship scores table
    const { error: updateError } = await supabase
      .from('communication_relationship_scores')
      .upsert({
        entity_type,
        entity_id,
        total_communications: totalComms,
        inbound_count: inboundCount,
        outbound_count: outboundCount,
        avg_sentiment: avgSentiment,
        avg_response_time_hours: avgResponseTimeHours,
        days_since_contact: Math.floor(hoursSinceContact / 24),
        risk_level: riskLevel,
        risk_factors: riskFactors,
        health_score: healthScore,
        recommended_action: recommendedAction,
        recommended_channel: recommendedChannel,
        relationship_summary: relationshipSummary,
        preferred_channel: channelBreakdown ? Object.entries(channelBreakdown).sort((a, b) => b[1] - a[1])[0]?.[0] : null,
        last_inbound_at: communications?.find(c => c.direction === 'inbound')?.original_timestamp,
        last_outbound_at: communications?.find(c => c.direction === 'outbound')?.original_timestamp,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'entity_type,entity_id,owner_id',
      });

    if (updateError) {
      console.error('[relationship-insights] Update error:', updateError);
    }

    const insights = {
      entity_type,
      entity_id,
      entity_name: entityName,
      entity_details: entityDetails,
      metrics: {
        total_communications: totalComms,
        inbound_count: inboundCount,
        outbound_count: outboundCount,
        avg_sentiment: avgSentiment,
        avg_response_time_hours: avgResponseTimeHours,
        hours_since_contact: hoursSinceContact,
        channel_breakdown: channelBreakdown,
      },
      health: {
        score: healthScore,
        risk_level: riskLevel,
        risk_factors: riskFactors,
      },
      recommendations: {
        action: recommendedAction,
        channel: recommendedChannel,
      },
      patterns: patterns || [],
      summary: relationshipSummary,
    };

    console.log(`[relationship-insights] Generated insights for ${entityName}`);

    return new Response(
      JSON.stringify({ success: true, insights }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[relationship-insights] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
