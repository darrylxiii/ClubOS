import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createFunctionLogger } from "../_shared/function-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const logger = createFunctionLogger('generate-company-intelligence-report');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logger.logRequest(req.method);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { company_id, period_days = 90 } = await req.json();

    if (!company_id) {
      throw new Error('company_id is required');
    }

    logger.info('Generating intelligence report', { company_id, period_days });
    logger.checkpoint('validated_input');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period_days);

    // Fetch company data
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', company_id)
      .single();

    if (companyError || !company) {
      throw new Error(`Company not found: ${companyError?.message}`);
    }

    logger.checkpoint('fetched_company');

    // Fetch interactions in period
    const { data: interactions, error: interactionsError } = await supabase
      .from('company_interactions')
      .select('*')
      .eq('company_id', company_id)
      .gte('interaction_date', startDate.toISOString())
      .order('interaction_date', { ascending: false });

    if (interactionsError) {
      throw interactionsError;
    }

    // Fetch stakeholders
    const { data: stakeholders, error: stakeholdersError } = await supabase
      .from('company_stakeholders')
      .select('*')
      .eq('company_id', company_id)
      .order('engagement_score', { ascending: false });

    if (stakeholdersError) {
      throw stakeholdersError;
    }

    logger.checkpoint('fetched_interactions');

    // Fetch insights
    const interactionIds = interactions?.map(i => i.id) || [];
    let insights: any[] = [];
    
    if (interactionIds.length > 0) {
      const { data: insightsData, error: insightsError } = await supabase
        .from('interaction_insights')
        .select('*')
        .in('interaction_id', interactionIds)
        .order('created_at', { ascending: false });

      if (!insightsError && insightsData) {
        insights = insightsData;
      }
    }

    // Fetch active jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .eq('company_id', company_id)
      .eq('status', 'open');

    // Calculate metrics
    const interactionsByType = (interactions || []).reduce((acc: any, int: any) => {
      acc[int.interaction_type] = (acc[int.interaction_type] || 0) + 1;
      return acc;
    }, {});

    const avgResponseTime = interactions
      ?.filter((i: any) => i.duration_minutes)
      .reduce((sum: number, i: any) => sum + i.duration_minutes, 0) / 
      (interactions?.filter((i: any) => i.duration_minutes).length || 1);

    const avgSentiment = interactions
      ?.filter((i: any) => i.sentiment_score !== null)
      .reduce((sum: number, i: any) => sum + i.sentiment_score, 0) /
      (interactions?.filter((i: any) => i.sentiment_score !== null).length || 1);

    const avgUrgency = interactions
      ?.filter((i: any) => i.urgency_score !== null)
      .reduce((sum: number, i: any) => sum + i.urgency_score, 0) /
      (interactions?.filter((i: any) => i.urgency_score !== null).length || 1);

    // Group insights by type
    const insightsByType = insights.reduce((acc: any, insight: any) => {
      if (!acc[insight.insight_type]) acc[insight.insight_type] = [];
      acc[insight.insight_type].push(insight);
      return acc;
    }, {});

    // Calculate interaction frequency trend (last 30 vs previous 30)
    const last30Days = interactions?.filter((i: any) => {
      const date = new Date(i.interaction_date);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return date >= thirtyDaysAgo;
    }).length || 0;

    const previous30Days = interactions?.filter((i: any) => {
      const date = new Date(i.interaction_date);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return date >= sixtyDaysAgo && date < thirtyDaysAgo;
    }).length || 0;

    const frequencyTrend = previous30Days > 0 
      ? ((last30Days - previous30Days) / previous30Days) * 100 
      : 0;

    logger.checkpoint('calculated_metrics');

    // Build AI prompt for recommendations
    const aiPrompt = `Analyze this company intelligence and provide strategic recommendations:

**Company:** ${company.name}
**Period:** Last ${period_days} days

**Interaction Summary:**
- Total interactions: ${interactions?.length || 0}
- By type: ${JSON.stringify(interactionsByType)}
- Frequency trend: ${frequencyTrend > 0 ? '+' : ''}${frequencyTrend.toFixed(1)}% vs previous period
- Average sentiment: ${avgSentiment.toFixed(2)} (-1 to +1 scale)
- Average urgency: ${avgUrgency.toFixed(1)}/10

**Stakeholders (${stakeholders?.length || 0} total):**
${stakeholders?.slice(0, 5).map((s: any) => 
  `- ${s.full_name} (${s.job_title || 'Unknown'}) - ${s.role_type} - Engagement: ${s.engagement_score}/100`
).join('\n') || 'No stakeholders'}

**Key Insights:**
- Pain points: ${insightsByType.pain_point?.length || 0}
- Budget signals: ${insightsByType.budget_signal?.length || 0}
- Red flags: ${insightsByType.red_flag?.length || 0}
- Positive signals: ${insightsByType.positive_signal?.length || 0}

**Active Jobs:** ${jobs?.length || 0}

Provide recommendations in JSON format:
{
  "overall_health_score": 0-100 (company relationship health),
  "relationship_status": "hot_lead/warm/cooling/cold/ghost",
  "primary_concerns": ["top 3 concerns or risks"],
  "opportunities": ["top 3 opportunities"],
  "recommended_actions": [
    {"action": "specific action", "priority": "high/medium/low", "rationale": "why"}
  ],
  "best_contact": "stakeholder name to reach out to",
  "optimal_timing": "when to reach out",
  "decision_timeline_estimate": "estimated days to decision",
  "ghost_risk": 0-100 (probability of ghosting),
  "competitive_position": "leading/competing/losing/unknown"
}

Return ONLY valid JSON.`;

    logger.info('Calling Lovable AI for recommendations');

    // Call Lovable AI for recommendations
    const aiStartTime = Date.now();
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a strategic business intelligence analyst. Provide actionable recommendations based on interaction data. Always return valid JSON only.'
          },
          {
            role: 'user',
            content: aiPrompt
          }
        ],
        temperature: 0.4,
      }),
    });

    logger.logExternalCall('lovable-ai', '/v1/chat/completions', aiResponse.status, Date.now() - aiStartTime);

    let aiRecommendations = null;
    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      let aiContent = aiData.choices[0].message.content;
      aiContent = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      aiRecommendations = JSON.parse(aiContent);
      logger.info('AI recommendations generated');
    } else {
      logger.warn('AI API failed, using basic recommendations');
      aiRecommendations = {
        overall_health_score: 50,
        relationship_status: 'warm',
        primary_concerns: ['Limited interaction data'],
        opportunities: ['Increase engagement'],
        recommended_actions: [
          { action: 'Schedule follow-up', priority: 'medium', rationale: 'Maintain momentum' }
        ],
        best_contact: stakeholders?.[0]?.full_name || 'Unknown',
        optimal_timing: 'Within 7 days',
      };
    }

    logger.checkpoint('generated_recommendations');

    // Compile comprehensive report
    const report = {
      company: {
        id: company.id,
        name: company.name,
        industry: company.industry,
        company_size: company.company_size,
      },
      period: {
        days: period_days,
        start_date: startDate.toISOString(),
        end_date: new Date().toISOString(),
      },
      interaction_summary: {
        total: interactions?.length || 0,
        by_type: interactionsByType,
        last_30_days: last30Days,
        frequency_trend_percent: Math.round(frequencyTrend),
        avg_response_time_hours: Math.round(avgResponseTime || 0),
        avg_sentiment: Number(avgSentiment.toFixed(2)),
        avg_urgency: Number(avgUrgency.toFixed(1)),
      },
      stakeholder_map: {
        total_stakeholders: stakeholders?.length || 0,
        decision_makers: stakeholders?.filter((s: any) => s.role_type === 'decision_maker').length || 0,
        influencers: stakeholders?.filter((s: any) => s.role_type === 'influencer').length || 0,
        champions: stakeholders?.filter((s: any) => s.role_type === 'champion').length || 0,
        top_stakeholders: stakeholders?.slice(0, 5).map((s: any) => ({
          id: s.id,
          name: s.full_name,
          title: s.job_title,
          role_type: s.role_type,
          engagement_score: s.engagement_score,
          sentiment_score: s.sentiment_score,
          last_contact: s.last_contacted_at,
        })) || [],
      },
      hiring_intelligence: {
        avg_urgency_score: Number(avgUrgency.toFixed(1)),
        active_jobs: jobs?.length || 0,
        job_titles: jobs?.map((j: any) => j.title) || [],
        budget_signals_detected: insightsByType.budget_signal?.length || 0,
        timeline_mentions: insightsByType.decision_timeline?.length || 0,
        pain_points_identified: insightsByType.pain_point?.length || 0,
      },
      insights_summary: {
        total_insights: insights.length,
        by_type: Object.keys(insightsByType).map(type => ({
          type,
          count: insightsByType[type].length
        })),
        red_flags: insightsByType.red_flag?.map((i: any) => i.insight_text) || [],
        positive_signals: insightsByType.positive_signal?.map((i: any) => i.insight_text) || [],
        competitors_mentioned: insightsByType.competitor_mention?.map((i: any) => i.insight_text) || [],
      },
      ai_recommendations: aiRecommendations,
      generated_at: new Date().toISOString(),
    };

    // Cache report in interaction_ml_features table
    const { error: cacheError } = await supabase
      .from('interaction_ml_features')
      .upsert({
        entity_type: 'company',
        entity_id: company_id,
        period_start: startDate.toISOString(),
        period_end: new Date().toISOString(),
        features: report,
        computed_at: new Date().toISOString(),
      }, {
        onConflict: 'entity_type,entity_id,period_start'
      });

    if (cacheError) {
      logger.warn('Failed to cache report', { error: cacheError.message });
    }

    logger.logSuccess(200, { company_id, company_name: company.name });

    return new Response(
      JSON.stringify({
        success: true,
        report,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.logError(500, errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
