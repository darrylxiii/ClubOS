import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyticsQuery {
  query: string;
  context?: {
    timeRange?: string;
    segment?: string;
    metric?: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify admin role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roles?.role !== 'admin') {
      throw new Error('Admin access required');
    }

    const { query, context }: AnalyticsQuery = await req.json();

    console.log('Analytics query received:', { query, context, userId: user.id });

    // Fetch relevant analytics context
    const analyticsContext = await fetchAnalyticsContext(supabase, context);

    // Build system prompt for Club AI
    const systemPrompt = `You are Club AI, an analytics expert for The Quantum Club platform. You help admins understand user behavior patterns, churn risks, and optimization opportunities.

Current Analytics Context:
${JSON.stringify(analyticsContext, null, 2)}

Your role:
- Explain metrics in clear, actionable terms
- Identify patterns and anomalies
- Suggest specific retention strategies
- Provide confidence scores for predictions
- Focus on business impact

When asked about:
- Churn: Analyze behavior patterns leading to disengagement
- Retention: Suggest specific actions based on user segments
- Anomalies: Explain unusual patterns with data-driven reasoning
- Trends: Project future outcomes with confidence levels`;

    // Call Lovable AI Gateway
    const aiResponse = await fetch('https://api.lovable.app/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const responseText = aiData.choices[0].message.content;

    // Store the query and response
    await supabase.from('admin_analytics_queries').insert({
      admin_id: user.id,
      query_text: query,
      response_text: responseText,
      query_context: context || {},
    });

    // Generate and store insight if applicable
    const insightType = determineInsightType(query);
    if (insightType) {
      await supabase.from('analytics_ai_insights').insert({
        insight_type: insightType,
        user_segment: context?.segment,
        insight_content: {
          query,
          response: responseText,
          context: analyticsContext,
        },
        confidence_score: 0.85,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        action_items: extractActionItems(responseText),
      });
    }

    console.log('Club AI response generated successfully');

    return new Response(
      JSON.stringify({
        response: responseText,
        context: analyticsContext,
        insight_type: insightType,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analytics-ai-assistant:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: errorMessage.includes('Unauthorized') ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function fetchAnalyticsContext(supabase: any, context?: any) {
  const timeRange = context?.timeRange || '7d';
  const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 1;
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysAgo);

  // Fetch key metrics
  const [churnSignals, userSegments, engagementData, frustrationData] = await Promise.all([
    supabase
      .from('user_churn_signals')
      .select('*')
      .gte('detected_at', startDate.toISOString())
      .order('risk_score', { ascending: false })
      .limit(10),
    
    supabase
      .from('user_behavior_embeddings')
      .select('cluster_id, segment_label, anomaly_score')
      .not('cluster_id', 'is', null)
      .limit(100),
    
    supabase
      .from('user_engagement_scores')
      .select('*')
      .gte('calculation_date', startDate.toISOString())
      .order('engagement_score', { ascending: false })
      .limit(50),
    
    supabase
      .from('user_frustration_signals')
      .select('signal_type, count')
      .gte('created_at', startDate.toISOString())
  ]);

  return {
    timeRange,
    churnSignalsCount: churnSignals.data?.length || 0,
    topChurnRisks: churnSignals.data?.slice(0, 5),
    userSegments: groupBySegment(userSegments.data || []),
    avgEngagement: calculateAverage(engagementData.data || [], 'engagement_score'),
    frustrationSignals: frustrationData.data || [],
    totalUsersAnalyzed: userSegments.data?.length || 0,
  };
}

function groupBySegment(data: any[]) {
  const groups: Record<string, number> = {};
  data.forEach(item => {
    const label = item.segment_label || 'Unknown';
    groups[label] = (groups[label] || 0) + 1;
  });
  return groups;
}

function calculateAverage(data: any[], field: string): number {
  if (data.length === 0) return 0;
  const sum = data.reduce((acc, item) => acc + (item[field] || 0), 0);
  return Math.round((sum / data.length) * 100) / 100;
}

function determineInsightType(query: string): string | null {
  const lowerQuery = query.toLowerCase();
  if (lowerQuery.includes('churn') || lowerQuery.includes('leaving')) {
    return 'churn_explanation';
  }
  if (lowerQuery.includes('retention') || lowerQuery.includes('keep')) {
    return 'retention_strategy';
  }
  if (lowerQuery.includes('anomaly') || lowerQuery.includes('unusual')) {
    return 'anomaly_analysis';
  }
  if (lowerQuery.includes('trend') || lowerQuery.includes('forecast') || lowerQuery.includes('predict')) {
    return 'trend_forecast';
  }
  return null;
}

function extractActionItems(response: string): string[] {
  const items: string[] = [];
  const lines = response.split('\n');
  
  for (const line of lines) {
    if (line.match(/^[-•*]\s/) || line.match(/^\d+\.\s/)) {
      const cleaned = line.replace(/^[-•*\d.]\s*/, '').trim();
      if (cleaned.length > 10 && cleaned.length < 200) {
        items.push(cleaned);
      }
    }
  }
  
  return items.slice(0, 5);
}