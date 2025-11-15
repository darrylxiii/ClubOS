import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Try both environment variable patterns (Lovable Cloud uses VITE_ prefix)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    console.log('[SEED] Supabase URL check:', supabaseUrl ? 'Found' : 'Missing');
    
    if (!supabaseUrl) {
      throw new Error('Supabase URL not found in environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[SEED] Starting test data creation...');

    // Get a test company (or use first available)
    const { data: companies, error: companyError } = await supabase
      .from('companies')
      .select('id, name')
      .limit(1)
      .single();

    if (companyError || !companies) {
      throw new Error('No company found. Please create a company first.');
    }

    const companyId = companies.id;
    console.log(`[SEED] Using company: ${companies.name} (${companyId})`);

    // Create test stakeholders
    const stakeholders = [
      { full_name: 'Sarah Johnson', email: 'sarah.j@testcompany.com', job_title: 'CTO', role_type: 'decision_maker' },
      { full_name: 'Mike Chen', email: 'mike.c@testcompany.com', job_title: 'VP Engineering', role_type: 'influencer' },
      { full_name: 'Lisa Rodriguez', email: 'lisa.r@testcompany.com', job_title: 'Head of Talent', role_type: 'gatekeeper' },
    ];

    const createdStakeholders = [];
    for (const stakeholder of stakeholders) {
      const { data, error } = await supabase
        .from('company_stakeholders')
        .insert({
          company_id: companyId,
          full_name: stakeholder.full_name,
          email: stakeholder.email,
          job_title: stakeholder.job_title,
          role_type: stakeholder.role_type,
          is_test_data: true, // Mark as test data
        })
        .select()
        .single();

      if (error) {
        console.error('[SEED] Error creating stakeholder:', error);
        continue;
      }
      createdStakeholders.push(data);
      console.log(`[SEED] Created stakeholder: ${stakeholder.full_name}`);
    }

    // Create test interactions
    const interactions = [
      {
        interaction_type: 'meeting',
        interaction_subtype: 'video_call',
        raw_content: `Discussion about senior backend engineer role. Sarah mentioned they need someone with strong distributed systems experience. Timeline: wants to start interviews within 2 weeks. Budget approved for senior level ($180k-$220k range). Team is growing fast, 3 more hires planned this quarter.`,
        duration_minutes: 45,
        sentiment_score: 0.85,
        urgency_score: 0.9,
      },
      {
        interaction_type: 'email',
        interaction_subtype: 'outbound',
        raw_content: `Follow-up email from Mike about technical requirements. Key points: Must have experience with Go and Kubernetes, bonus if they've worked at scale (1M+ users). They're moving fast because current team is overloaded. Mike emphasized cultural fit is critical.`,
        duration_minutes: 10,
        sentiment_score: 0.75,
        urgency_score: 0.7,
      },
      {
        interaction_type: 'phone_call',
        interaction_subtype: 'inbound',
        raw_content: `Quick sync with Lisa about interview process. They want to move candidates through quickly: 1 screening call, 1 technical round, 1 culture fit, then offer. Lisa mentioned they've lost good candidates to slow processes before. Budget for relocation available if needed.`,
        duration_minutes: 20,
        sentiment_score: 0.90,
        urgency_score: 0.85,
      },
    ];

    const createdInteractions = [];
    for (let i = 0; i < interactions.length; i++) {
      const interaction = interactions[i];
      const { data, error } = await supabase
        .from('company_interactions')
        .insert({
          company_id: companyId,
          interaction_type: interaction.interaction_type,
          interaction_subtype: interaction.interaction_subtype,
          raw_content: interaction.raw_content,
          interaction_date: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString(), // Stagger by days
          duration_minutes: interaction.duration_minutes,
          sentiment_score: interaction.sentiment_score,
          urgency_score: interaction.urgency_score,
          is_test_data: true, // Mark as test data
        })
        .select()
        .single();

      if (error) {
        console.error('[SEED] Error creating interaction:', error);
        continue;
      }

      // Link stakeholders to interaction
      if (createdStakeholders.length > 0) {
        const stakeholderId = createdStakeholders[i % createdStakeholders.length].id;
        await supabase.from('interaction_participants').insert({
          interaction_id: data.id,
          stakeholder_id: stakeholderId,
          participation_type: i === 0 ? 'initiator' : 'participant',
          engagement_score: 0.8 + (Math.random() * 0.2),
        });
      }

      createdInteractions.push(data);
      console.log(`[SEED] Created interaction: ${interaction.interaction_type}`);
    }

    console.log('[SEED] Test data created successfully!');
    console.log(`[SEED] Next steps:`);
    console.log(`[SEED] 1. Run extract-interaction-insights for each interaction`);
    console.log(`[SEED] 2. Run calculate-stakeholder-influence for company`);
    console.log(`[SEED] 3. Run generate-company-intelligence-report for company`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test intelligence data created successfully',
        data: {
          company_id: companyId,
          company_name: companies.name,
          stakeholders_created: createdStakeholders.length,
          interactions_created: createdInteractions.length,
          interaction_ids: createdInteractions.map(i => i.id),
        },
        next_steps: [
          `POST to extract-interaction-insights with each interaction_id`,
          `POST to calculate-stakeholder-influence with company_id`,
          `POST to generate-company-intelligence-report with company_id`,
        ],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[SEED] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
