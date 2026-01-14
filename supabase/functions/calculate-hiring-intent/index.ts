import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { publicCorsHeaders as corsHeaders } from '../_shared/cors-config.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { company_id } = await req.json();

    console.log(`Calculating hiring intent for company: ${company_id || 'all'}`);

    // Get companies to process
    const companyIds = company_id 
      ? [company_id]
      : (await supabase.from('companies').select('id')).data?.map(c => c.id) || [];

    const results = [];

    for (const cId of companyIds) {
      // Get recent interactions (last 90 days)
      const { data: interactions } = await supabase
        .from('company_interactions')
        .select('interaction_type, sentiment, urgency_level, context, notes, created_at')
        .eq('company_id', cId)
        .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (!interactions || interactions.length === 0) {
        await supabase
          .from('companies')
          .update({ 
            hiring_intent_score: 0,
            hiring_intent_updated_at: new Date().toISOString()
          })
          .eq('id', cId);
        continue;
      }

      // Calculate intent score
      let score = 0;
      let weightSum = 0;

      interactions.forEach((interaction, index) => {
        // Recency weight (newer interactions matter more)
        const daysAgo = Math.floor((Date.now() - new Date(interaction.created_at).getTime()) / (1000 * 60 * 60 * 24));
        const recencyWeight = Math.max(0.1, 1 - (daysAgo / 90));

        // Interaction type weight
        const typeWeights: Record<string, number> = {
          'hiring_request': 10,
          'urgent_need': 10,
          'interview_scheduled': 9,
          'offer_discussion': 9,
          'candidate_shortlist_request': 8,
          'job_posting': 7,
          'talent_discussion': 6,
          'market_inquiry': 4,
          'general_check_in': 2
        };
        const typeWeight = typeWeights[interaction.interaction_type] || 5;

        // Urgency weight
        const urgencyWeights: Record<string, number> = {
          'critical': 10,
          'high': 7,
          'medium': 5,
          'low': 2
        };
        const urgencyWeight = urgencyWeights[interaction.urgency_level] || 5;

        // Sentiment weight
        const sentimentWeights: Record<string, number> = {
          'positive': 1.2,
          'neutral': 1.0,
          'negative': 0.7
        };
        const sentimentWeight = sentimentWeights[interaction.sentiment] || 1.0;

        // Keyword signals in context/notes
        const text = `${interaction.context || ''} ${interaction.notes || ''}`.toLowerCase();
        let keywordBonus = 0;
        if (text.includes('asap') || text.includes('urgent') || text.includes('immediately')) keywordBonus += 2;
        if (text.includes('budget') || text.includes('salary') || text.includes('compensation')) keywordBonus += 1.5;
        if (text.includes('start date') || text.includes('onboard') || text.includes('when can')) keywordBonus += 1.5;
        if (text.includes('interview') || text.includes('meet') || text.includes('schedule')) keywordBonus += 1;

        const interactionScore = (typeWeight + urgencyWeight + keywordBonus) * sentimentWeight * recencyWeight;
        score += interactionScore;
        weightSum += recencyWeight;
      });

      // Normalize to 0-100 scale
      const normalizedScore = Math.min(100, (score / Math.max(1, weightSum)) * 2);

      // Update company
      const { error: updateError } = await supabase
        .from('companies')
        .update({ 
          hiring_intent_score: Math.round(normalizedScore * 100) / 100,
          hiring_intent_updated_at: new Date().toISOString()
        })
        .eq('id', cId);

      if (updateError) {
        console.error(`Error updating company ${cId}:`, updateError);
      }

      results.push({
        company_id: cId,
        intent_score: Math.round(normalizedScore * 100) / 100,
        interaction_count: interactions.length
      });

      console.log(`Company ${cId}: Intent score = ${normalizedScore.toFixed(2)}`);
    }

    return new Response(
      JSON.stringify({
        processed_companies: results.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in calculate-hiring-intent:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
