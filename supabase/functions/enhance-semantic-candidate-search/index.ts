import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { publicCorsHeaders as corsHeaders } from "../_shared/cors-config.ts";

interface SearchFilters {
  talent_tiers?: string[];
  industries?: string[];
  seniority_levels?: string[];
  locations?: string[];
  min_move_probability?: number;
  availability_statuses?: string[];
  owned_by_strategist_id?: string;
  has_gdpr_consent?: boolean;
}

interface SearchRequest {
  query: string;
  filters?: SearchFilters;
  limit?: number;
  include_explanation?: boolean;
  similarity_threshold?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      query,
      filters = {},
      limit = 25,
      include_explanation = false,
      similarity_threshold = 0.5
    }: SearchRequest = await req.json();

    if (!query || query.trim().length === 0) {
      throw new Error('Search query is required');
    }

    console.log(`[enhance-semantic-candidate-search] Query: "${query}", Limit: ${limit}`);

    // Generate embedding for the search query using existing generate-embeddings function
    const { data: embeddingResponse, error: embeddingError } = await supabase.functions.invoke(
      'generate-embeddings',
      {
        body: {
          content: query,
          type: 'search_query'
        }
      }
    );

    if (embeddingError || !embeddingResponse?.embedding) {
      console.error('[enhance-semantic-candidate-search] Embedding error:', embeddingError);
      // Fall back to keyword search if embedding fails
      return await keywordSearch(supabase, query, filters, limit);
    }

    const queryEmbedding = embeddingResponse.embedding;

    // Build the search query with filters
    let searchQuery = supabase
      .from('candidate_profiles')
      .select(`
        id,
        full_name,
        email,
        current_title,
        current_company,
        location,
        years_of_experience,
        talent_tier,
        tier_score,
        move_probability,
        availability_status,
        seniority_level,
        industries,
        functions,
        skills,
        ai_summary,
        profile_completeness,
        linkedin_url,
        avatar_url,
        owned_by_strategist_id,
        profiles:owned_by_strategist_id(full_name, avatar_url)
      `)
      .eq('data_deletion_requested', false)
      .is('gdpr_consent', true);

    // Apply filters
    if (filters.talent_tiers && filters.talent_tiers.length > 0) {
      searchQuery = searchQuery.in('talent_tier', filters.talent_tiers);
    }

    if (filters.seniority_levels && filters.seniority_levels.length > 0) {
      searchQuery = searchQuery.in('seniority_level', filters.seniority_levels);
    }

    if (filters.min_move_probability !== undefined) {
      searchQuery = searchQuery.gte('move_probability', filters.min_move_probability);
    }

    if (filters.availability_statuses && filters.availability_statuses.length > 0) {
      searchQuery = searchQuery.in('availability_status', filters.availability_statuses);
    }

    if (filters.owned_by_strategist_id) {
      searchQuery = searchQuery.eq('owned_by_strategist_id', filters.owned_by_strategist_id);
    }

    // Location filter (partial match)
    if (filters.locations && filters.locations.length > 0) {
      const locationConditions = filters.locations.map(loc => `location.ilike.%${loc}%`);
      searchQuery = searchQuery.or(locationConditions.join(','));
    }

    // Industry filter (array overlap)
    if (filters.industries && filters.industries.length > 0) {
      searchQuery = searchQuery.overlaps('industries', filters.industries);
    }

    const { data: candidates, error: searchError } = await searchQuery.limit(limit * 2);

    if (searchError) {
      throw searchError;
    }

    if (!candidates || candidates.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          query,
          results: [],
          total: 0,
          message: 'No candidates found matching the criteria'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate similarity scores for each candidate
    const candidatesWithScores = await Promise.all(
      candidates.map(async (candidate) => {
        // Get candidate's embedding from intelligence_embeddings
        const { data: embeddingData } = await supabase
          .from('intelligence_embeddings')
          .select('embedding')
          .eq('entity_id', candidate.id)
          .eq('entity_type', 'candidate')
          .single();

        let similarityScore = 0;

        if (embeddingData?.embedding) {
          // Calculate cosine similarity
          similarityScore = cosineSimilarity(queryEmbedding, embeddingData.embedding);
        } else {
          // Fallback: text-based relevance score
          similarityScore = calculateTextRelevance(query, candidate);
        }

        return {
          ...candidate,
          similarity_score: Math.round(similarityScore * 100) / 100
        };
      })
    );

    // Filter by similarity threshold and sort
    const rankedCandidates = candidatesWithScores
      .filter(c => c.similarity_score >= similarity_threshold)
      .sort((a, b) => {
        // Primary sort by similarity, secondary by move probability
        if (Math.abs(a.similarity_score - b.similarity_score) < 0.05) {
          return (b.move_probability || 0) - (a.move_probability || 0);
        }
        return b.similarity_score - a.similarity_score;
      })
      .slice(0, limit);

    // Generate explanations if requested
    let results = rankedCandidates;
    if (include_explanation && rankedCandidates.length > 0) {
      results = rankedCandidates.map(candidate => ({
        ...candidate,
        match_explanation: generateMatchExplanation(query, candidate)
      }));
    }

    console.log(`[enhance-semantic-candidate-search] Found ${results.length} matching candidates`);

    return new Response(
      JSON.stringify({
        success: true,
        query,
        filters,
        results,
        total: results.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[enhance-semantic-candidate-search] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function keywordSearch(supabase: any, query: string, filters: SearchFilters, limit: number) {
  console.log('[enhance-semantic-candidate-search] Falling back to keyword search');

  const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 2);

  let searchQuery = supabase
    .from('candidate_profiles')
    .select(`
      id,
      full_name,
      email,
      current_title,
      current_company,
      location,
      years_of_experience,
      talent_tier,
      tier_score,
      move_probability,
      availability_status,
      seniority_level,
      industries,
      functions,
      skills,
      ai_summary,
      profile_completeness,
      linkedin_url,
      avatar_url
    `)
    .eq('data_deletion_requested', false)
    .is('gdpr_consent', true);

  // Apply text search
  if (keywords.length > 0) {
    const searchTerm = keywords.join(' | ');
    searchQuery = searchQuery.or(
      `full_name.ilike.%${query}%,current_title.ilike.%${query}%,current_company.ilike.%${query}%,ai_summary.ilike.%${query}%`
    );
  }

  // Apply filters
  if (filters.talent_tiers && filters.talent_tiers.length > 0) {
    searchQuery = searchQuery.in('talent_tier', filters.talent_tiers);
  }

  if (filters.min_move_probability !== undefined) {
    searchQuery = searchQuery.gte('move_probability', filters.min_move_probability);
  }

  const { data: candidates, error } = await searchQuery
    .order('tier_score', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return new Response(
    JSON.stringify({
      success: true,
      query,
      filters,
      results: candidates || [],
      total: candidates?.length || 0,
      search_type: 'keyword'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function calculateTextRelevance(query: string, candidate: any): number {
  const queryLower = query.toLowerCase();
  const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2);
  
  let score = 0;
  let maxScore = queryTerms.length * 10;

  const searchableText = [
    candidate.full_name,
    candidate.current_title,
    candidate.current_company,
    candidate.location,
    candidate.ai_summary,
    ...(candidate.skills || []),
    ...(candidate.industries || []),
    ...(candidate.functions || [])
  ].filter(Boolean).join(' ').toLowerCase();

  for (const term of queryTerms) {
    if (searchableText.includes(term)) {
      score += 10;
    } else if (searchableText.split(/\s+/).some(word => word.startsWith(term))) {
      score += 5;
    }
  }

  return maxScore > 0 ? score / maxScore : 0;
}

function generateMatchExplanation(query: string, candidate: any): string {
  const matches: string[] = [];
  const queryLower = query.toLowerCase();

  if (candidate.current_title?.toLowerCase().includes(queryLower.split(' ')[0])) {
    matches.push(`Title matches "${candidate.current_title}"`);
  }

  if (candidate.industries?.some((ind: string) => queryLower.includes(ind.toLowerCase()))) {
    matches.push(`Industry experience in ${candidate.industries.join(', ')}`);
  }

  if (candidate.skills?.some((skill: string) => queryLower.includes(skill.toLowerCase()))) {
    const matchedSkills = candidate.skills.filter((s: string) => 
      queryLower.includes(s.toLowerCase())
    );
    matches.push(`Skills: ${matchedSkills.slice(0, 3).join(', ')}`);
  }

  if (candidate.move_probability >= 70) {
    matches.push(`High move probability: ${candidate.move_probability}%`);
  }

  if (candidate.talent_tier === 'hot') {
    matches.push('Currently marked as Hot prospect');
  }

  if (matches.length === 0) {
    matches.push('Semantic similarity based on profile content');
  }

  return matches.join(' • ');
}
