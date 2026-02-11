/**
 * Auto-Match Candidates Edge Function
 * Triggered when a job is published — finds top matching candidates
 * using vector similarity + rule-based filters, inserts into talent_matches.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { job_id, limit = 25, threshold = 0.5 } = await req.json();

    if (!job_id) {
      return new Response(
        JSON.stringify({ error: 'job_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log(`Auto-matching candidates for job: ${job_id}`);

    // 1. Fetch the job details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, title, description, requirements, location, is_remote, salary_min, salary_max, company_id, job_embedding')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      throw new Error(`Job not found: ${jobError?.message || 'unknown'}`);
    }

    // 2. Generate job embedding if missing
    let jobEmbedding = job.job_embedding;
    if (!jobEmbedding) {
      console.log('Job has no embedding, generating...');
      const jobText = [
        job.title,
        job.location ? `Location: ${job.location}` : '',
        job.location ? `Location: ${job.location}` : '',
        job.description || '',
        Array.isArray(job.requirements) ? `Requirements: ${job.requirements.join(', ')}` : (job.requirements || ''),
      ].filter(Boolean).join('. ');

      const embResponse = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: jobText.trim(),
          encoding_format: 'float',
        }),
      });

      if (!embResponse.ok) {
        throw new Error(`Failed to generate job embedding: ${embResponse.status}`);
      }

      const embData = await embResponse.json();
      jobEmbedding = embData.data[0].embedding;

      // Store the embedding
      const vectorString = `[${jobEmbedding.join(',')}]`;
      await supabase
        .from('jobs')
        .update({ job_embedding: vectorString, embedding_generated_at: new Date().toISOString() })
        .eq('id', job_id);

      console.log('Job embedding generated and stored');
    }

    // 3. Find candidates with embeddings via cosine similarity
    // Use the RPC function if available, otherwise fallback
    const vectorString = Array.isArray(jobEmbedding)
      ? `[${jobEmbedding.join(',')}]`
      : jobEmbedding;

    let matchedCandidates: any[] = [];

    // Try semantic search RPC first
    const { data: semanticResults, error: rpcError } = await supabase.rpc(
      'semantic_search_candidates',
      {
        query_embedding: vectorString,
        match_threshold: threshold,
        match_count: limit * 2, // Fetch more than needed to filter
      }
    );

    if (rpcError) {
      console.warn('RPC semantic_search_candidates failed, using fallback:', rpcError.message);
      // Fallback: fetch all candidates with embeddings
      const { data: candidates } = await supabase
        .from('candidate_profiles')
        .select('id, full_name, current_title, current_company, location, salary_expectation, salary_currency, work_authorization, profile_completeness')
        .not('profile_embedding', 'is', null)
        .limit(200);

      matchedCandidates = (candidates || []).map(c => ({
        ...c,
        similarity_score: 0.5, // Default when no vector search
      }));
    } else {
      matchedCandidates = semanticResults || [];
    }

    console.log(`Found ${matchedCandidates.length} candidates with embeddings`);

    // 4. Apply rule-based filters on top of semantic results
    const filteredCandidates = matchedCandidates.map((candidate: any) => {
      let bonusScore = 0;
      const matchFactors: string[] = [];

      // Semantic similarity (primary factor)
      const semanticScore = candidate.similarity_score || candidate.similarity || 0;
      matchFactors.push(`Semantic fit: ${Math.round(semanticScore * 100)}%`);

      // Salary compatibility
      if (job.salary_min && job.salary_max && candidate.salary_expectation) {
        const salaryInRange =
          candidate.salary_expectation >= job.salary_min * 0.85 &&
          candidate.salary_expectation <= job.salary_max * 1.15;
        if (salaryInRange) {
          bonusScore += 0.1;
          matchFactors.push('Salary in range');
        } else {
          bonusScore -= 0.05;
          matchFactors.push('Salary mismatch');
        }
      }

      // Location compatibility
      if (job.is_remote) {
        bonusScore += 0.05;
        matchFactors.push('Remote compatible');
      } else if (candidate.location && job.location) {
        const sameLocation = candidate.location.toLowerCase().includes(job.location.toLowerCase()) ||
          job.location.toLowerCase().includes(candidate.location.toLowerCase());
        if (sameLocation) {
          bonusScore += 0.08;
          matchFactors.push('Location match');
        }
      }

      // Profile completeness bonus
      if (candidate.profile_completeness && candidate.profile_completeness > 60) {
        bonusScore += 0.03;
        matchFactors.push('Complete profile');
      }

      const finalScore = Math.min(1, Math.max(0, semanticScore + bonusScore));

      return {
        candidate_id: candidate.id,
        candidate_name: candidate.full_name,
        match_score: Math.round(finalScore * 100),
        similarity_score: semanticScore,
        match_factors: matchFactors,
      };
    })
      .filter((c: any) => c.match_score >= threshold * 100)
      .sort((a: any, b: any) => b.match_score - a.match_score)
      .slice(0, limit);

    console.log(`After filtering: ${filteredCandidates.length} matches`);

    // 5. Insert into talent_matches (upsert to avoid duplicates)
    const matchInserts = filteredCandidates.map((match: any) => ({
      job_id: job_id,
      candidate_id: match.candidate_id,
      match_score: match.match_score,
      match_type: 'auto_semantic',
      match_factors: {
        factors: match.match_factors,
        similarity_score: match.similarity_score,
        generated_at: new Date().toISOString(),
        model: 'text-embedding-3-small',
      },
      status: 'pending_review',
    }));

    if (matchInserts.length > 0) {
      const { error: insertError } = await supabase
        .from('talent_matches')
        .upsert(matchInserts, {
          onConflict: 'job_id,candidate_id',
          ignoreDuplicates: false,
        });

      if (insertError) {
        console.error('Insert error:', insertError.message);
        // Try individual inserts as fallback
        let inserted = 0;
        for (const match of matchInserts) {
          const { error: singleError } = await supabase
            .from('talent_matches')
            .upsert(match, { onConflict: 'job_id,candidate_id' });
          if (!singleError) inserted++;
        }
        console.log(`Individually inserted ${inserted}/${matchInserts.length} matches`);
      }
    }

    // 6. Create a notification for the strategist
    if (filteredCandidates.length > 0) {
      // Find the job owner/strategist
      const topMatch = filteredCandidates[0];
      console.log(`Top match: ${topMatch.candidate_name} (${topMatch.match_score}%)`);

      // Insert activity feed entry
      await supabase.from('activity_feed').insert({
        event_type: 'auto_match_completed',
        event_data: {
          job_id: job_id,
          job_title: job.title,
          matches_found: filteredCandidates.length,
          top_score: topMatch.match_score,
          message: `QUIN found ${filteredCandidates.length} potential matches for "${job.title}"`,
        },
        company_id: job.company_id,
        visibility: 'internal',
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        job_id,
        job_title: job.title,
        matches_found: filteredCandidates.length,
        matches: filteredCandidates,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Auto-match error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
