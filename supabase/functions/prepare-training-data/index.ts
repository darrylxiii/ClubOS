import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { limit = 1000, offset = 0, include_semantic = true } = await req.json();

    console.log(`Preparing training data: limit=${limit}, offset=${offset}`);

    // Get applications with known outcomes
    const { data: applications, error: appsError } = await supabase
      .from('applications')
      .select(`
        id,
        candidate_id,
        job_id,
        status,
        applied_at,
        match_score
      `)
      .in('status', ['hired', 'rejected', 'interview', 'offer'])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (appsError) throw appsError;
    if (!applications || applications.length === 0) {
      return new Response(
        JSON.stringify({ training_data: [], count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${applications.length} applications with outcomes`);

    // For each application, generate or fetch features
    const trainingData = [];
    let featuresGenerated = 0;
    let semanticScoresCalculated = 0;

    for (const app of applications) {
      try {
        // Generate features via edge function
        const { data: featureData, error: featureError } = await supabase.functions.invoke(
          'generate-ml-features',
          {
            body: {
              candidate_id: app.candidate_id,
              job_id: app.job_id,
              application_id: app.id,
              use_cache: true
            }
          }
        );

        if (featureError || !featureData?.features) {
          console.warn(`Failed to generate features for app ${app.id}:`, featureError);
          continue;
        }

        featuresGenerated++;
        const features = featureData.features;

        // Calculate semantic similarity if requested
        let semanticSimilarity = null;
        if (include_semantic) {
          const { data: candidateData } = await supabase
            .from('candidate_profiles')
            .select('embedding')
            .eq('id', app.candidate_id)
            .single();

          const { data: jobData } = await supabase
            .from('jobs')
            .select('embedding')
            .eq('id', app.job_id)
            .single();

          if (candidateData?.embedding && jobData?.embedding) {
            // Calculate cosine similarity
            const { data: simData } = await supabase.rpc('cosine_similarity', {
              vec1: candidateData.embedding,
              vec2: jobData.embedding
            });
            
            semanticSimilarity = simData;
            semanticScoresCalculated++;
          }
        }

        // Determine labels based on application status
        const labels = {
          label_hired: app.status === 'hired',
          label_interviewed: ['interview', 'hired', 'offer'].includes(app.status),
          label_rejected: app.status === 'rejected'
        };

        trainingData.push({
          application_id: app.id,
          candidate_id: app.candidate_id,
          job_id: app.job_id,
          features,
          semantic_similarity_score: semanticSimilarity,
          ...labels,
          match_score_at_time: app.match_score,
          created_at: app.applied_at
        });

      } catch (error) {
        console.error(`Error processing application ${app.id}:`, error);
      }
    }

    console.log(`Prepared ${trainingData.length} training samples`);
    console.log(`Features generated: ${featuresGenerated}, Semantic scores: ${semanticScoresCalculated}`);

    // Store in ml_training_data table
    if (trainingData.length > 0) {
      const { error: insertError } = await supabase
        .from('ml_training_data')
        .upsert(trainingData, {
          onConflict: 'application_id',
          ignoreDuplicates: false
        });

      if (insertError) {
        console.error('Error inserting training data:', insertError);
      }
    }

    return new Response(
      JSON.stringify({
        training_data: trainingData,
        count: trainingData.length,
        features_generated: featuresGenerated,
        semantic_scores: semanticScoresCalculated
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in prepare-training-data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
