import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LeadFeatures {
  emailEngagement: number;
  responseSpeed: number;
  sentimentScore: number;
  intentScore: number;
  companyFit: number;
  behaviorPattern: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { prospect_id, calculate_all } = await req.json();

    const prospects = calculate_all
      ? (await supabase.from('crm_prospects').select('*').in('stage', ['replied', 'qualified', 'meeting_booked', 'proposal_sent', 'negotiation'])).data || []
      : prospect_id
        ? [(await supabase.from('crm_prospects').select('*').eq('id', prospect_id).single()).data]
        : [];

    const results = [];

    for (const prospect of prospects) {
      if (!prospect) continue;

      // Gather engagement data
      const { data: replies } = await supabase
        .from('crm_email_replies')
        .select('*')
        .eq('prospect_id', prospect.id)
        .order('created_at', { ascending: false });

      const { data: activities } = await supabase
        .from('crm_prospect_activities')
        .select('*')
        .eq('prospect_id', prospect.id)
        .order('created_at', { ascending: false });

      const { data: intelligence } = await supabase
        .from('crm_reply_intelligence')
        .select('*')
        .eq('prospect_id', prospect.id)
        .order('created_at', { ascending: false })
        .limit(1);

      // Calculate features
      const features = calculateFeatures(prospect, replies || [], activities || [], intelligence?.[0]);
      
      // ML-style weighted scoring
      const conversionProbability = calculateConversionProbability(features);
      const confidenceInterval = calculateConfidence(replies?.length || 0, activities?.length || 0);
      
      // Determine recommended action
      const recommendedAction = determineAction(conversionProbability, prospect.stage, features);
      
      // Calculate optimal contact time based on patterns
      const optimalContactTime = calculateOptimalContactTime(replies || []);

      // Upsert prediction
      const { data: prediction, error } = await supabase
        .from('crm_lead_predictions')
        .upsert({
          prospect_id: prospect.id,
          conversion_probability: conversionProbability,
          confidence_interval: confidenceInterval,
          feature_importance: {
            emailEngagement: features.emailEngagement * 0.25,
            responseSpeed: features.responseSpeed * 0.20,
            sentimentScore: features.sentimentScore * 0.15,
            intentScore: features.intentScore * 0.20,
            companyFit: features.companyFit * 0.10,
            behaviorPattern: features.behaviorPattern * 0.10,
          },
          recommended_action: recommendedAction,
          optimal_contact_time: optimalContactTime,
          engagement_velocity: features.emailEngagement,
          response_pattern: {
            avgResponseTimeHours: calculateAvgResponseTime(replies || []),
            totalReplies: replies?.length || 0,
            lastReplyDaysAgo: replies?.[0] ? daysSince(replies[0].created_at) : null,
          },
          updated_at: new Date().toISOString(),
        }, { onConflict: 'prospect_id' })
        .select()
        .single();

      if (!error) {
        results.push(prediction);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      predictions: results,
      count: results.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Lead scoring error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateFeatures(
  prospect: any,
  replies: any[],
  activities: any[],
  intelligence: any
): LeadFeatures {
  // Email engagement (0-100)
  const emailEngagement = Math.min(100, (replies.length * 15) + (activities.length * 5));
  
  // Response speed (0-100) - faster is better
  const avgResponseHours = calculateAvgResponseTime(replies);
  const responseSpeed = avgResponseHours > 0 ? Math.max(0, 100 - (avgResponseHours * 2)) : 50;
  
  // Sentiment score from intelligence (0-100)
  const sentimentScore = intelligence?.intent_score || 50;
  
  // Intent score based on stage and signals
  const stageScores: Record<string, number> = {
    'new': 10, 'contacted': 20, 'replied': 40, 'qualified': 60,
    'meeting_booked': 75, 'proposal_sent': 85, 'negotiation': 90,
  };
  const intentScore = stageScores[prospect.stage] || 30;
  
  // Company fit (simplified - would use more data in production)
  const companyFit = prospect.company_name ? 70 : 40;
  
  // Behavior pattern
  const recentActivity = activities.filter(a => daysSince(a.created_at) < 7).length;
  const behaviorPattern = Math.min(100, recentActivity * 20);

  return {
    emailEngagement,
    responseSpeed,
    sentimentScore,
    intentScore,
    companyFit,
    behaviorPattern,
  };
}

function calculateConversionProbability(features: LeadFeatures): number {
  const weights = {
    emailEngagement: 0.25,
    responseSpeed: 0.20,
    sentimentScore: 0.15,
    intentScore: 0.20,
    companyFit: 0.10,
    behaviorPattern: 0.10,
  };

  const score = 
    features.emailEngagement * weights.emailEngagement +
    features.responseSpeed * weights.responseSpeed +
    features.sentimentScore * weights.sentimentScore +
    features.intentScore * weights.intentScore +
    features.companyFit * weights.companyFit +
    features.behaviorPattern * weights.behaviorPattern;

  return Math.round(Math.min(99, Math.max(1, score)) * 100) / 100;
}

function calculateConfidence(replyCount: number, activityCount: number): number {
  const dataPoints = replyCount + activityCount;
  if (dataPoints === 0) return 20;
  if (dataPoints < 3) return 40;
  if (dataPoints < 7) return 60;
  if (dataPoints < 15) return 80;
  return 90;
}

function determineAction(probability: number, stage: string, features: LeadFeatures): string {
  if (probability >= 80) return 'Schedule call immediately - high conversion likelihood';
  if (probability >= 60) return 'Send personalized follow-up with case study';
  if (probability >= 40) return 'Nurture with valuable content';
  if (features.emailEngagement < 20) return 'Re-engage with new angle';
  return 'Continue automated sequence';
}

function calculateOptimalContactTime(replies: any[]): string | null {
  if (replies.length === 0) return null;
  
  // Analyze when they typically reply
  const replyHours = replies.map(r => new Date(r.created_at).getUTCHours());
  const avgHour = replyHours.reduce((a, b) => a + b, 0) / replyHours.length;
  
  const nextContact = new Date();
  nextContact.setUTCHours(Math.round(avgHour), 0, 0, 0);
  
  // If that time has passed today, schedule for tomorrow
  if (nextContact < new Date()) {
    nextContact.setDate(nextContact.getDate() + 1);
  }
  
  return nextContact.toISOString();
}

function calculateAvgResponseTime(replies: any[]): number {
  if (replies.length < 2) return 24; // Default to 24 hours
  
  let totalHours = 0;
  for (let i = 1; i < replies.length; i++) {
    const diff = new Date(replies[i - 1].created_at).getTime() - new Date(replies[i].created_at).getTime();
    totalHours += diff / (1000 * 60 * 60);
  }
  
  return totalHours / (replies.length - 1);
}

function daysSince(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}
