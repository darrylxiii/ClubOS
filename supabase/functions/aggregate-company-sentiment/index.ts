import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { publicCorsHeaders } from '../_shared/cors-config.ts';

const corsHeaders = publicCorsHeaders;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { company_id, all = false } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get companies to process
    let companyIds: string[] = [];
    
    if (company_id) {
      companyIds = [company_id];
    } else if (all) {
      // Get all companies with email matches
      const { data: companies } = await supabase
        .from('email_contact_matches')
        .select('company_id')
        .not('company_id', 'is', null);
      
      companyIds = [...new Set(companies?.map(c => c.company_id) || [])];
    }

    console.log('Aggregating sentiment for companies:', companyIds.length);

    const results = [];

    for (const compId of companyIds) {
      // Get all email matches for this company
      const { data: matches } = await supabase
        .from('email_contact_matches')
        .select('*')
        .eq('company_id', compId)
        .order('email_date', { ascending: false });

      if (!matches || matches.length === 0) {
        console.log('No matches for company:', compId);
        continue;
      }

      // Calculate aggregates
      const totalEmails = matches.length;
      const inboundCount = matches.filter(m => m.direction === 'inbound').length;
      const outboundCount = matches.filter(m => m.direction === 'outbound').length;
      
      const sentimentScores = matches
        .filter(m => m.sentiment_score !== null)
        .map(m => Number(m.sentiment_score));
      
      const avgSentimentScore = sentimentScores.length > 0
        ? sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length
        : 0;

      // Sentiment breakdown
      const positiveCount = matches.filter(m => m.sentiment_label === 'positive').length;
      const neutralCount = matches.filter(m => m.sentiment_label === 'neutral').length;
      const negativeCount = matches.filter(m => m.sentiment_label === 'negative').length;

      // Calculate health score (0-100)
      // Factors: sentiment, recency, volume, response rate
      const daysSinceLastEmail = matches[0]?.email_date
        ? Math.floor((Date.now() - new Date(matches[0].email_date).getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      
      const recencyScore = Math.max(0, 100 - (daysSinceLastEmail * 5)); // Lose 5 points per day
      const sentimentScoreNormalized = ((avgSentimentScore + 1) / 2) * 100; // Convert -1..1 to 0..100
      const volumeScore = Math.min(100, totalEmails * 5); // 5 points per email, max 100
      
      const healthScore = Math.round(
        (recencyScore * 0.3) + 
        (sentimentScoreNormalized * 0.5) + 
        (volumeScore * 0.2)
      );

      // Determine health status
      let healthStatus = 'unknown';
      if (healthScore >= 80) healthStatus = 'excellent';
      else if (healthScore >= 60) healthStatus = 'good';
      else if (healthScore >= 40) healthStatus = 'at_risk';
      else healthStatus = 'critical';

      // Calculate sentiment trend (compare last 5 vs previous 5)
      let sentimentTrend = 'stable';
      if (matches.length >= 10) {
        const recentScores = matches.slice(0, 5)
          .filter(m => m.sentiment_score !== null)
          .map(m => Number(m.sentiment_score));
        const olderScores = matches.slice(5, 10)
          .filter(m => m.sentiment_score !== null)
          .map(m => Number(m.sentiment_score));
        
        if (recentScores.length > 0 && olderScores.length > 0) {
          const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
          const olderAvg = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;
          
          if (recentAvg > olderAvg + 0.1) sentimentTrend = 'improving';
          else if (recentAvg < olderAvg - 0.1) sentimentTrend = 'declining';
        }
      }

      // Upsert the aggregation
      const aggregation = {
        company_id: compId,
        total_emails: totalEmails,
        inbound_count: inboundCount,
        outbound_count: outboundCount,
        avg_sentiment_score: Math.round(avgSentimentScore * 100) / 100,
        sentiment_breakdown: {
          positive: positiveCount,
          neutral: neutralCount,
          negative: negativeCount,
        },
        last_email_at: matches[0]?.email_date,
        last_inbound_at: matches.find(m => m.direction === 'inbound')?.email_date,
        last_outbound_at: matches.find(m => m.direction === 'outbound')?.email_date,
        health_score: healthScore,
        health_status: healthStatus,
        sentiment_trend: sentimentTrend,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('company_email_sentiment')
        .upsert(aggregation, { onConflict: 'company_id' });

      if (error) {
        console.error('Error upserting sentiment for company:', compId, error);
      } else {
        results.push(aggregation);
      }
    }

    console.log('Aggregation complete. Processed companies:', results.length);

    return new Response(
      JSON.stringify({
        success: true,
        processed_count: results.length,
        results: results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in aggregate-company-sentiment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
