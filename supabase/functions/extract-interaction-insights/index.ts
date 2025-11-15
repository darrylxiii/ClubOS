import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    if (!supabaseUrl || !supabaseKey || !lovableApiKey) {
      throw new Error('Missing required environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { interaction_id } = await req.json();

    if (!interaction_id) {
      throw new Error('interaction_id is required');
    }

    console.log(`[Extract Insights] Processing interaction: ${interaction_id}`);

    // Fetch interaction with participants
    const { data: interaction, error: fetchError } = await supabase
      .from('company_interactions')
      .select(`
        *,
        company:companies(name),
        job:jobs(title),
        interaction_participants(
          stakeholder:company_stakeholders(full_name, job_title, role_type)
        )
      `)
      .eq('id', interaction_id)
      .single();

    if (fetchError) {
      console.error('[Extract Insights] Fetch error:', fetchError);
      throw new Error(`Failed to fetch interaction: ${fetchError.message}`);
    }
    
    if (!interaction) {
      throw new Error('Interaction not found');
    }
    
    if (!interaction.raw_content || interaction.raw_content.trim() === '') {
      throw new Error('Interaction has no content to analyze');
    }

    // Build AI prompt
    const participantNames = interaction.interaction_participants
      ?.map((p: any) => p.stakeholder?.full_name || 'Unknown')
      .join(', ') || 'Unknown';

    const prompt = `Analyze this business interaction and extract structured intelligence:

**Interaction Details:**
- Type: ${interaction.interaction_type}
- Date: ${interaction.interaction_date}
- Company: ${interaction.company?.name || 'Unknown'}
- Job Discussed: ${interaction.job?.title || 'Not specified'}
- Participants: ${participantNames}
- Subject: ${interaction.subject || 'N/A'}
- Summary: ${interaction.summary || 'N/A'}
- Content: ${interaction.raw_content || 'No content available'}

**Extract the following in JSON format:**
{
  "hiring_urgency": 0-10 (how urgent is their hiring need?),
  "budget_signals": {
    "detected": true/false,
    "mentions": ["list of budget/compensation mentions"],
    "estimated_range": "e.g., €80k-100k or not specified"
  },
  "timeline": {
    "deadlines": ["list of mentioned deadlines/dates"],
    "urgency_level": "low/medium/high",
    "estimated_days_to_decision": number or null
  },
  "pain_points": ["list of problems they're trying to solve"],
  "decision_stage": "exploration/active_search/final_decision/post_decision",
  "stakeholder_sentiments": {
    "stakeholder_name": -1 to 1 (sentiment score)
  },
  "red_flags": ["list of concerns, blockers, or negative signals"],
  "positive_signals": ["list of enthusiasm, progress, or positive indicators"],
  "next_actions": ["list of recommended next steps"],
  "key_quotes": ["important verbatim quotes from the interaction"],
  "competitor_mentions": ["any competitors mentioned"],
  "cultural_insights": ["insights about company culture or values"]
}

Return ONLY valid JSON, no markdown formatting.`;

    console.log('[Extract Insights] Calling Lovable AI...');

    // Call Lovable AI
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
            content: 'You are an expert business intelligence analyst. Extract structured insights from business interactions. Always return valid JSON only, no markdown.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[Extract Insights] AI API Error:', errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let aiContent = aiData.choices[0].message.content;
    
    // Clean JSON response
    aiContent = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const insights = JSON.parse(aiContent);

    console.log('[Extract Insights] Extracted insights:', insights);

    // Store insights in database
    const insightsToInsert = [];

    // Hiring urgency
    if (insights.hiring_urgency !== undefined) {
      insightsToInsert.push({
        interaction_id,
        insight_type: 'hiring_urgency',
        insight_text: `Hiring urgency level: ${insights.hiring_urgency}/10`,
        confidence_score: 0.85,
        extracted_budget: null,
        extracted_date: null,
      });
    }

    // Budget signals
    if (insights.budget_signals?.detected) {
      insightsToInsert.push({
        interaction_id,
        insight_type: 'budget_signal',
        insight_text: insights.budget_signals.estimated_range || 'Budget discussed',
        confidence_score: 0.8,
        evidence_quotes: insights.budget_signals.mentions || [],
      });
    }

    // Timeline
    if (insights.timeline?.deadlines?.length > 0) {
      insightsToInsert.push({
        interaction_id,
        insight_type: 'decision_timeline',
        insight_text: `Timeline urgency: ${insights.timeline.urgency_level}`,
        confidence_score: 0.85,
        extracted_date: insights.timeline.deadlines[0],
        evidence_quotes: insights.timeline.deadlines,
      });
    }

    // Pain points
    insights.pain_points?.forEach((point: string) => {
      insightsToInsert.push({
        interaction_id,
        insight_type: 'pain_point',
        insight_text: point,
        confidence_score: 0.75,
      });
    });

    // Red flags
    insights.red_flags?.forEach((flag: string) => {
      insightsToInsert.push({
        interaction_id,
        insight_type: 'red_flag',
        insight_text: flag,
        confidence_score: 0.8,
      });
    });

    // Positive signals
    insights.positive_signals?.forEach((signal: string) => {
      insightsToInsert.push({
        interaction_id,
        insight_type: 'positive_signal',
        insight_text: signal,
        confidence_score: 0.8,
      });
    });

    // Competitor mentions
    insights.competitor_mentions?.forEach((competitor: string) => {
      insightsToInsert.push({
        interaction_id,
        insight_type: 'competitor_mention',
        insight_text: competitor,
        confidence_score: 0.9,
      });
    });

    // Insert all insights
    if (insightsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('interaction_insights')
        .insert(insightsToInsert);

      if (insertError) {
        console.error('[Extract Insights] Error inserting insights:', insertError);
        throw insertError;
      }
    }

    // Update interaction with AI-extracted data
    const { error: updateError } = await supabase
      .from('company_interactions')
      .update({
        key_topics: insights.pain_points || [],
        sentiment_score: Object.values(insights.stakeholder_sentiments || {}).reduce((a: number, b: unknown) => a + (typeof b === 'number' ? b : 0), 0) / 
                        (Object.keys(insights.stakeholder_sentiments || {}).length || 1),
        urgency_score: insights.hiring_urgency || null,
        deal_stage_hint: insights.decision_stage || null,
        next_action: insights.next_actions?.[0] || null,
      })
      .eq('id', interaction_id);

    if (updateError) {
      console.error('[Extract Insights] Error updating interaction:', updateError);
    }

    console.log(`[Extract Insights] Successfully extracted ${insightsToInsert.length} insights`);

    return new Response(
      JSON.stringify({
        success: true,
        insights_extracted: insightsToInsert.length,
        insights,
        next_actions: insights.next_actions || [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Extract Insights] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
