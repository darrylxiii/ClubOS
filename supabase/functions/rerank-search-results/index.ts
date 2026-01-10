/**
 * Cross-Encoder Re-Ranking Edge Function
 * 
 * Takes top 50 candidates from hybrid search and re-ranks to top 5-10
 * using cross-encoder model. Research shows this improves accuracy by 30%.
 * 
 * Uses Lovable AI for cross-encoder scoring simulation since we don't have
 * direct access to specialized re-ranking models.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchCandidate {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
  score: number;
  source_type?: string;
  entity_id?: string;
}

interface RerankRequest {
  query: string;
  candidates: SearchCandidate[];
  topK?: number;
  includeScores?: boolean;
}

interface RerankResult {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
  originalScore: number;
  rerankScore: number;
  originalRank: number;
  finalRank: number;
  source_type?: string;
  entity_id?: string;
}

/**
 * Cross-encoder scoring using Lovable AI
 * Simulates cross-encoder behavior by scoring query-document pairs
 */
async function crossEncoderScore(
  query: string,
  candidates: SearchCandidate[],
  apiKey: string
): Promise<Map<string, number>> {
  const scores = new Map<string, number>();
  
  // Process in batches of 10 for efficiency
  const batchSize = 10;
  const batches: SearchCandidate[][] = [];
  
  for (let i = 0; i < candidates.length; i += batchSize) {
    batches.push(candidates.slice(i, i + batchSize));
  }
  
  for (const batch of batches) {
    const scoringPrompt = `You are a semantic relevance scorer. Score each document's relevance to the query on a scale of 0.0 to 1.0.

QUERY: "${query}"

DOCUMENTS TO SCORE:
${batch.map((c, i) => `[DOC_${i}] ${c.content.slice(0, 500)}`).join('\n\n')}

Return ONLY a JSON object with document indices as keys and scores as values.
Example: {"DOC_0": 0.85, "DOC_1": 0.42, "DOC_2": 0.91}

Consider:
- Semantic similarity (not just keyword matching)
- Query intent fulfillment
- Information completeness
- Contextual relevance`;

    try {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { role: 'system', content: 'You are a precise semantic relevance scorer. Return only valid JSON.' },
            { role: 'user', content: scoringPrompt }
          ],
          temperature: 0.1,
          max_completion_tokens: 500,
        }),
      });

      if (!response.ok) {
        console.error('AI scoring failed:', response.status);
        // Fallback to original scores
        batch.forEach(c => scores.set(c.id, c.score));
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      // Extract JSON from response
      const jsonMatch = content.match(/\{[^{}]*\}/);
      if (jsonMatch) {
        const scoreData = JSON.parse(jsonMatch[0]);
        batch.forEach((c, i) => {
          const key = `DOC_${i}`;
          const score = parseFloat(scoreData[key]) || c.score;
          scores.set(c.id, Math.max(0, Math.min(1, score)));
        });
      } else {
        batch.forEach(c => scores.set(c.id, c.score));
      }
    } catch (error) {
      console.error('Scoring batch error:', error);
      batch.forEach(c => scores.set(c.id, c.score));
    }
  }
  
  return scores;
}

/**
 * Fast heuristic pre-filtering before expensive cross-encoder
 * Keeps candidates that have high keyword overlap or semantic potential
 */
function preFilter(
  query: string,
  candidates: SearchCandidate[],
  maxCandidates: number = 50
): SearchCandidate[] {
  const queryTerms = new Set(
    query.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(t => t.length > 2)
  );
  
  // Score by term overlap + original score
  const scored = candidates.map(c => {
    const contentTerms = c.content.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/);
    
    const overlapCount = contentTerms.filter(t => queryTerms.has(t)).length;
    const overlapScore = queryTerms.size > 0 ? overlapCount / queryTerms.size : 0;
    
    // Combine original score with overlap
    const combinedScore = (c.score * 0.7) + (overlapScore * 0.3);
    
    return { candidate: c, combinedScore };
  });
  
  // Sort by combined score and take top N
  return scored
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, maxCandidates)
    .map(s => s.candidate);
}

/**
 * Log re-ranking metrics to database
 */
async function logRerankMetrics(
  supabase: ReturnType<typeof createClient>,
  queryId: string,
  originalRanks: number[],
  finalRanks: number[],
  rerankTimeMs: number
): Promise<void> {
  try {
    await supabase.from('rag_evaluation_metrics').insert({
      query_id: queryId,
      original_ranks: originalRanks,
      final_ranks: finalRanks,
      rerank_time_ms: rerankTimeMs,
      rerank_model: 'gemini-3-flash-crossencoder',
    });
  } catch (error) {
    console.error('Failed to log rerank metrics:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { query, candidates, topK = 5, includeScores = true }: RerankRequest = await req.json();

    if (!query || !candidates || candidates.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Query and candidates are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Re-ranking ${candidates.length} candidates for query: "${query.slice(0, 50)}..."`);

    // Step 1: Pre-filter to top 50 if more candidates provided
    const preFiltered = preFilter(query, candidates, 50);
    console.log(`Pre-filtered to ${preFiltered.length} candidates`);

    // Step 2: Cross-encoder scoring
    const rerankScores = await crossEncoderScore(query, preFiltered, LOVABLE_API_KEY);

    // Step 3: Create results with both scores
    const results: RerankResult[] = preFiltered.map((c, i) => ({
      id: c.id,
      content: c.content,
      metadata: c.metadata,
      originalScore: c.score,
      rerankScore: rerankScores.get(c.id) || c.score,
      originalRank: i + 1,
      finalRank: 0, // Will be set after sorting
      source_type: c.source_type,
      entity_id: c.entity_id,
    }));

    // Step 4: Sort by rerank score
    results.sort((a, b) => b.rerankScore - a.rerankScore);

    // Step 5: Assign final ranks
    results.forEach((r, i) => {
      r.finalRank = i + 1;
    });

    // Step 6: Take top K
    const topResults = results.slice(0, topK);

    const rerankTimeMs = Date.now() - startTime;

    // Log metrics
    const queryId = crypto.randomUUID();
    await logRerankMetrics(
      supabase,
      queryId,
      topResults.map(r => r.originalRank),
      topResults.map(r => r.finalRank),
      rerankTimeMs
    );

    // Calculate rank changes for insight
    const avgRankChange = topResults.reduce(
      (sum, r) => sum + Math.abs(r.originalRank - r.finalRank),
      0
    ) / topResults.length;

    console.log(`Re-ranking complete in ${rerankTimeMs}ms. Avg rank change: ${avgRankChange.toFixed(1)}`);

    return new Response(
      JSON.stringify({
        queryId,
        results: includeScores ? topResults : topResults.map(r => ({
          id: r.id,
          content: r.content,
          metadata: r.metadata,
          source_type: r.source_type,
          entity_id: r.entity_id,
        })),
        metrics: {
          totalCandidates: candidates.length,
          preFilteredCount: preFiltered.length,
          rerankTimeMs,
          avgRankChange,
          topKReturned: topResults.length,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Rerank error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
