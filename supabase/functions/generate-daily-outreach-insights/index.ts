import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Gather data for analysis
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get campaign performance
    const { data: campaigns } = await supabase
      .from('crm_campaigns')
      .select('*')
      .gte('updated_at', weekAgo.toISOString());

    // Get recent replies
    const { data: replies } = await supabase
      .from('crm_email_replies')
      .select('*, crm_reply_intelligence(*)')
      .gte('created_at', weekAgo.toISOString());

    // Get account health
    const { data: accounts } = await supabase
      .from('instantly_account_health')
      .select('*');

    // Get predictions
    const { data: predictions } = await supabase
      .from('crm_lead_predictions')
      .select('*')
      .gte('updated_at', weekAgo.toISOString())
      .order('conversion_probability', { ascending: false })
      .limit(10);

    // Calculate metrics
    const totalSent = campaigns?.reduce((sum, c) => sum + (c.total_sent || 0), 0) || 0;
    const totalOpened = campaigns?.reduce((sum, c) => sum + (c.total_opened || 0), 0) || 0;
    const totalReplied = campaigns?.reduce((sum, c) => sum + (c.total_replied || 0), 0) || 0;
    
    const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
    const replyRate = totalSent > 0 ? (totalReplied / totalSent) * 100 : 0;

    const hotReplies = replies?.filter(r => 
      r.smart_category === 'hot' || r.smart_category === 'interested'
    ).length || 0;

    const avgHealthScore = accounts?.length 
      ? accounts.reduce((sum, a) => sum + (a.health_score || 0), 0) / accounts.length 
      : 100;

    const highProbabilityLeads = predictions?.filter(p => p.conversion_probability >= 70).length || 0;

    // Generate insights
    const insights = [];

    // Performance insight
    if (replyRate > 5) {
      insights.push({
        insight_type: 'performance',
        insight_title: 'Strong Reply Rate This Week',
        insight_content: `Your reply rate of ${replyRate.toFixed(1)}% is above industry average. Keep using your current subject line and personalization strategies.`,
        recommendations: ['A/B test to find even better variants', 'Scale up volume on top performers'],
        severity: 'positive',
      });
    } else if (replyRate < 2) {
      insights.push({
        insight_type: 'performance',
        insight_title: 'Reply Rate Needs Improvement',
        insight_content: `Your reply rate of ${replyRate.toFixed(1)}% is below the 3-5% benchmark. Consider revising your messaging.`,
        recommendations: ['Test different subject lines', 'Shorten email copy', 'Increase personalization'],
        severity: 'warning',
      });
    }

    // Hot leads insight
    if (hotReplies > 0) {
      insights.push({
        insight_type: 'opportunity',
        insight_title: `${hotReplies} Hot Lead${hotReplies > 1 ? 's' : ''} Detected`,
        insight_content: `You have ${hotReplies} replies showing high buying intent. These should be prioritized for immediate follow-up.`,
        recommendations: ['Respond within 1 hour', 'Prepare personalized proposals', 'Schedule calls today'],
        severity: 'positive',
      });
    }

    // Account health insight
    if (avgHealthScore < 70) {
      insights.push({
        insight_type: 'deliverability',
        insight_title: 'Email Account Health Alert',
        insight_content: `Average account health is ${avgHealthScore.toFixed(0)}%. This may impact deliverability.`,
        recommendations: ['Check warmup status', 'Reduce sending volume', 'Clean email lists'],
        severity: 'critical',
      });
    }

    // ML predictions insight
    if (highProbabilityLeads > 0) {
      insights.push({
        insight_type: 'ai_prediction',
        insight_title: `${highProbabilityLeads} High-Probability Lead${highProbabilityLeads > 1 ? 's' : ''}`,
        insight_content: `Our AI model predicts ${highProbabilityLeads} leads have >70% conversion probability. Focus your efforts here.`,
        recommendations: predictions?.slice(0, 3).map(p => p.recommended_action) || [],
        severity: 'positive',
      });
    }

    // Executive summary
    const executiveSummary = {
      period: 'Last 7 days',
      metrics: {
        emailsSent: totalSent,
        openRate: Math.round(openRate * 10) / 10,
        replyRate: Math.round(replyRate * 10) / 10,
        hotLeads: hotReplies,
        accountHealth: Math.round(avgHealthScore),
        predictedConversions: highProbabilityLeads,
      },
      topAction: insights[0]?.recommendations?.[0] || 'Continue current strategy',
      healthStatus: avgHealthScore >= 80 ? 'excellent' : avgHealthScore >= 60 ? 'good' : 'needs_attention',
    };

    // Store insights in database
    for (const insight of insights) {
      await supabase.from('crm_outreach_insights').insert({
        ...insight,
        is_actionable: true,
        expires_at: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(), // 24h expiry
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      executiveSummary,
      insights,
      generatedAt: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Daily insights generation error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
