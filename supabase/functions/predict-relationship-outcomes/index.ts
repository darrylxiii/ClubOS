import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PredictionInput {
  entity_type: 'candidate' | 'company' | 'contact';
  entity_id: string;
}

interface RelationshipMetrics {
  total_communications: number;
  response_rate: number;
  avg_response_time_hours: number;
  sentiment_trend: number;
  days_since_last_contact: number;
  channel_diversity: number;
  meeting_count: number;
  positive_interactions: number;
  negative_interactions: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { entity_type, entity_id }: PredictionInput = await req.json();

    console.log(`[predict-relationship-outcomes] Predicting for ${entity_type}:${entity_id}`);

    // Fetch communication history
    const { data: communications, error: commError } = await supabase
      .from('unified_communications')
      .select('*')
      .eq('entity_type', entity_type)
      .eq('entity_id', entity_id)
      .order('communication_date', { ascending: false })
      .limit(100);

    if (commError) throw commError;

    // Fetch relationship scores
    const { data: scores, error: scoresError } = await supabase
      .from('communication_relationship_scores')
      .select('*')
      .eq('entity_type', entity_type)
      .eq('entity_id', entity_id)
      .single();

    // Calculate metrics
    const metrics = calculateMetrics(communications || [], scores);

    // Generate predictions
    const predictions = generatePredictions(metrics);

    // Calculate optimal timing
    const optimalTiming = calculateOptimalTiming(communications || []);

    // Generate recommendations
    const recommendations = generateRecommendations(metrics, predictions);

    // Store prediction in database
    const { error: insertError } = await supabase
      .from('ml_predictions')
      .upsert({
        entity_type,
        entity_id,
        prediction_type: 'relationship_outcome',
        prediction_data: {
          metrics,
          predictions,
          optimalTiming,
          recommendations,
        },
        confidence_score: predictions.confidence,
        predicted_at: new Date().toISOString(),
      }, {
        onConflict: 'entity_type,entity_id,prediction_type'
      });

    if (insertError) {
      console.error('[predict-relationship-outcomes] Insert error:', insertError);
    }

    console.log(`[predict-relationship-outcomes] Generated predictions with ${predictions.confidence}% confidence`);

    return new Response(JSON.stringify({
      success: true,
      entity_type,
      entity_id,
      metrics,
      predictions,
      optimalTiming,
      recommendations,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[predict-relationship-outcomes] Error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateMetrics(communications: any[], scores: any): RelationshipMetrics {
  const now = new Date();
  const totalComms = communications.length;
  
  // Response rate calculation
  const outbound = communications.filter(c => c.direction === 'outbound').length;
  const inbound = communications.filter(c => c.direction === 'inbound').length;
  const responseRate = outbound > 0 ? Math.min((inbound / outbound) * 100, 100) : 0;

  // Average response time (simplified)
  const responseTimes: number[] = [];
  for (let i = 1; i < communications.length; i++) {
    if (communications[i].direction !== communications[i-1].direction) {
      const diff = new Date(communications[i-1].communication_date).getTime() - 
                   new Date(communications[i].communication_date).getTime();
      responseTimes.push(diff / (1000 * 60 * 60)); // hours
    }
  }
  const avgResponseTime = responseTimes.length > 0 
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
    : 24;

  // Days since last contact
  const lastContact = communications[0]?.communication_date;
  const daysSinceContact = lastContact 
    ? Math.floor((now.getTime() - new Date(lastContact).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  // Channel diversity
  const channels = new Set(communications.map(c => c.channel));
  const channelDiversity = channels.size / 4; // Max 4 channels

  // Sentiment analysis
  const sentiments = communications.map(c => c.sentiment_score || 0.5);
  const avgSentiment = sentiments.length > 0 
    ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length 
    : 0.5;

  // Meeting count
  const meetingCount = communications.filter(c => c.channel === 'meeting').length;

  // Positive/negative interactions
  const positive = communications.filter(c => (c.sentiment_score || 0.5) > 0.6).length;
  const negative = communications.filter(c => (c.sentiment_score || 0.5) < 0.4).length;

  return {
    total_communications: totalComms,
    response_rate: Math.round(responseRate),
    avg_response_time_hours: Math.round(avgResponseTime * 10) / 10,
    sentiment_trend: Math.round(avgSentiment * 100) / 100,
    days_since_last_contact: daysSinceContact,
    channel_diversity: Math.round(channelDiversity * 100) / 100,
    meeting_count: meetingCount,
    positive_interactions: positive,
    negative_interactions: negative,
  };
}

function generatePredictions(metrics: RelationshipMetrics) {
  // Conversion probability model (weighted factors)
  const weights = {
    response_rate: 0.25,
    sentiment: 0.20,
    recency: 0.20,
    engagement: 0.15,
    meetings: 0.20,
  };

  // Normalize metrics to 0-1 scale
  const responseScore = metrics.response_rate / 100;
  const sentimentScore = metrics.sentiment_trend;
  const recencyScore = Math.max(0, 1 - (metrics.days_since_last_contact / 30));
  const engagementScore = Math.min(1, metrics.total_communications / 20);
  const meetingScore = Math.min(1, metrics.meeting_count / 3);

  const conversionProbability = (
    responseScore * weights.response_rate +
    sentimentScore * weights.sentiment +
    recencyScore * weights.recency +
    engagementScore * weights.engagement +
    meetingScore * weights.meetings
  ) * 100;

  // Churn risk (inverse of engagement indicators)
  const churnFactors = {
    inactivity: metrics.days_since_last_contact > 14 ? 0.4 : metrics.days_since_last_contact / 35,
    lowResponse: metrics.response_rate < 30 ? 0.3 : 0,
    negativeSentiment: metrics.sentiment_trend < 0.4 ? 0.3 : 0,
  };
  const churnRisk = Math.min(100, (churnFactors.inactivity + churnFactors.lowResponse + churnFactors.negativeSentiment) * 100);

  // Engagement trajectory
  const trajectory = recencyScore > 0.7 && sentimentScore > 0.6 ? 'improving' 
    : recencyScore < 0.3 ? 'declining' 
    : 'stable';

  // Confidence based on data quantity
  const confidence = Math.min(95, 50 + (metrics.total_communications * 2));

  // Time to conversion estimate (days)
  const timeToConversion = conversionProbability > 70 ? 7 
    : conversionProbability > 50 ? 14 
    : conversionProbability > 30 ? 30 
    : 60;

  return {
    conversion_probability: Math.round(conversionProbability),
    churn_risk: Math.round(churnRisk),
    trajectory,
    confidence: Math.round(confidence),
    time_to_conversion_days: timeToConversion,
    health_score: Math.round((conversionProbability + (100 - churnRisk)) / 2),
  };
}

function calculateOptimalTiming(communications: any[]) {
  // Analyze response patterns by day and hour
  const responseTimes: { day: number; hour: number }[] = [];
  
  communications
    .filter(c => c.direction === 'inbound')
    .forEach(c => {
      const date = new Date(c.communication_date);
      responseTimes.push({
        day: date.getDay(),
        hour: date.getHours(),
      });
    });

  // Find most common response times
  const dayCount: Record<number, number> = {};
  const hourCount: Record<number, number> = {};
  
  responseTimes.forEach(rt => {
    dayCount[rt.day] = (dayCount[rt.day] || 0) + 1;
    hourCount[rt.hour] = (hourCount[rt.hour] || 0) + 1;
  });

  const bestDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '2';
  const bestHour = Object.entries(hourCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '10';

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  return {
    best_day: dayNames[parseInt(bestDay)],
    best_hour: parseInt(bestHour),
    best_time_formatted: `${dayNames[parseInt(bestDay)]} at ${parseInt(bestHour)}:00`,
    recommended_frequency_days: 3,
    avoid_hours: [22, 23, 0, 1, 2, 3, 4, 5, 6],
  };
}

function generateRecommendations(metrics: RelationshipMetrics, predictions: any) {
  const recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    action: string;
    reason: string;
    impact: string;
  }> = [];

  // High priority recommendations
  if (metrics.days_since_last_contact > 7) {
    recommendations.push({
      priority: 'high',
      action: 'Send a check-in message today',
      reason: `No contact in ${metrics.days_since_last_contact} days`,
      impact: '+15% engagement probability',
    });
  }

  if (predictions.churn_risk > 50) {
    recommendations.push({
      priority: 'high',
      action: 'Schedule a call to re-engage',
      reason: 'High churn risk detected',
      impact: '-25% churn probability',
    });
  }

  // Medium priority
  if (metrics.meeting_count === 0 && metrics.total_communications > 5) {
    recommendations.push({
      priority: 'medium',
      action: 'Propose a video call',
      reason: 'No meetings scheduled despite active communication',
      impact: '+20% conversion probability',
    });
  }

  if (metrics.channel_diversity < 0.5) {
    recommendations.push({
      priority: 'medium',
      action: 'Try a different communication channel',
      reason: 'Limited channel usage',
      impact: '+10% response rate',
    });
  }

  // Low priority
  if (metrics.response_rate > 70 && predictions.conversion_probability > 60) {
    recommendations.push({
      priority: 'low',
      action: 'Ask for referrals or testimonial',
      reason: 'Strong engagement indicates satisfaction',
      impact: 'Potential new leads',
    });
  }

  return recommendations.slice(0, 5);
}
