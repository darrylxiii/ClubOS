import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyId } = await req.json();
    
    if (!companyId) {
      return new Response(
        JSON.stringify({ error: 'Company ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch company interactions
    const { data: interactions } = await supabase
      .from('company_interactions')
      .select('*')
      .eq('company_id', companyId)
      .order('interaction_date', { ascending: false })
      .limit(50);

    // Fetch stakeholders
    const { data: stakeholders } = await supabase
      .from('company_stakeholders')
      .select('*')
      .eq('company_id', companyId);

    // Generate insights from data
    const totalInteractions = interactions?.length || 0;
    const avgSentiment = interactions?.reduce((sum, i) => sum + (i.sentiment_score || 0), 0) / (totalInteractions || 1);
    const urgentInteractions = interactions?.filter(i => (i.urgency_score || 0) > 7).length || 0;
    
    // Analyze interaction patterns
    const interactionTypes: Record<string, number> = {};
    interactions?.forEach(i => {
      interactionTypes[i.interaction_type] = (interactionTypes[i.interaction_type] || 0) + 1;
    });
    
    const preferredChannel = Object.entries(interactionTypes)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'email';

    // Identify key decision makers
    const decisionMakers = stakeholders?.filter(s => 
      s.role_type === 'decision_maker' || s.role_type === 'champion'
    ) || [];

    const insights = {
      engagement_score: Math.round(Math.min(100, totalInteractions * 5 + avgSentiment * 50)),
      sentiment_trend: avgSentiment > 0.3 ? 'positive' : avgSentiment < -0.3 ? 'negative' : 'neutral',
      urgent_matters: urgentInteractions,
      preferred_channel: preferredChannel,
      key_decision_makers: decisionMakers.length,
      recommendations: [] as string[],
      signals: [] as { type: string; message: string; priority: string }[],
    };

    // Generate AI recommendations
    if (urgentInteractions > 0) {
      insights.signals.push({
        type: 'urgency',
        message: `${urgentInteractions} high-urgency interactions require attention`,
        priority: 'high'
      });
    }

    if (avgSentiment < 0) {
      insights.signals.push({
        type: 'sentiment',
        message: 'Overall sentiment trending negative - consider proactive outreach',
        priority: 'medium'
      });
    }

    if (decisionMakers.length === 0 && stakeholders && stakeholders.length > 0) {
      insights.recommendations.push('Identify and tag key decision makers in your stakeholder list');
    }

    if (totalInteractions < 5) {
      insights.recommendations.push('Increase engagement frequency to build stronger relationship');
    }

    // Store insights
    await supabase
      .from('interaction_insights')
      .upsert({
        entity_type: 'company',
        entity_id: companyId,
        insight_type: 'company_intelligence',
        insight_data: insights,
        generated_at: new Date().toISOString(),
      }, { onConflict: 'entity_type,entity_id,insight_type' });

    return new Response(
      JSON.stringify({ insights }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Company insights error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
