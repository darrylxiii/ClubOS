

interface QueryVariationRequest {
    query: string;
    context?: string;
    numVariations?: number;
}

interface SearchResult {
    id: string;
    content: string;
    score: number;
    metadata?: Record<string, unknown>;
    source_type?: string;
    entity_id?: string;
}

interface RRFResult extends SearchResult {
    rrfScore: number;
    queryMatches: string[];
    queryRanks: Record<string, number>;
}

async function generateVariations(
    query: string,
    context: string | undefined,
    numVariations: number,
    apiKey: string
): Promise<{ variations: string[]; types: string[] }> {
    const prompt = `Generate ${numVariations} diverse search query variations for the following query.
Each variation should capture different aspects or phrasings of the user's intent.

ORIGINAL QUERY: "${query}"
${context ? `CONTEXT: ${context}` : ''}

Generate variations that are:
1. SYNONYM-BASED: Use different words with same meaning
2. EXPANDED: Add relevant context or specificity  
3. SIMPLIFIED: More concise, keyword-focused
${numVariations > 3 ? '4. QUESTION-FORM: Rephrase as a question' : ''}

Return ONLY a JSON object with this structure:
{
  "variations": ["variation1", "variation2", "variation3"],
  "types": ["synonym", "expanded", "simplified"]
}`;

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
                    { role: 'system', content: 'You generate search query variations. Return only valid JSON.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_completion_tokens: 500,
            }),
        });

        if (!response.ok) {
            console.error('AI variation generation failed:', response.status);
            return { variations: [], types: [] };
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';

        // Extract JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                variations: parsed.variations?.slice(0, numVariations) || [],
                types: parsed.types?.slice(0, numVariations) || [],
            };
        }
    } catch (error) {
        console.error('Variation generation error:', error);
    }

    // Fallback: generate simple variations
    return {
        variations: [
            query.split(' ').slice(0, 3).join(' '), // Simplified
            `${query} details`, // Expanded
        ],
        types: ['simplified', 'expanded'],
    };
}

async function generateEmbedding(
    text: string,
    apiKey: string
): Promise<number[]> {
    // Use Lovable AI to generate a pseudo-embedding via semantic hashing
    // In production, you'd call your generate-embeddings function
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'google/gemini-3-flash-preview',
            messages: [
                {
                    role: 'system',
                    content: 'Extract 20 key semantic features from the text as a JSON array of numbers between -1 and 1. Return ONLY the array.'
                },
                { role: 'user', content: text.slice(0, 500) }
            ],
            temperature: 0.1,
            max_completion_tokens: 200,
        }),
    });

    if (!response.ok) {
        // Return zero vector as fallback
        return new Array(20).fill(0);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';

    try {
        const arrayMatch = content.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
            return JSON.parse(arrayMatch[0]).slice(0, 20);
        }
    } catch {
        // Ignore parse errors
    }

    return new Array(20).fill(0);
}

async function searchWithQuery(
    supabase: any,
    query: string,
    _embedding: number[],
    limit: number = 50
): Promise<SearchResult[]> {
    // Fallback to text search on unified_communications
    const { data: textResults, error: textError } = await supabase
        .from('unified_communications')
        .select('id, content, source_type, entity_id, created_at')
        .ilike('content', `%${query.split(' ')[0]}%`)
        .limit(limit);

    if (textError) {
        console.error('Search error:', textError);
        return [];
    }

    return (textResults || []).map((r: any, i: number) => ({
        id: r.id,
        content: r.content || '',
        score: 1 - (i * 0.02),
        source_type: r.source_type,
        entity_id: r.entity_id,
    }));
}

function reciprocalRankFusion(
    queryResults: Map<string, SearchResult[]>,
    k: number = 60
): RRFResult[] {
    const fusedScores = new Map<string, {
        result: SearchResult;
        rrfScore: number;
        queryMatches: string[];
        queryRanks: Record<string, number>;
    }>();

    // Process results from each query
    for (const [queryKey, results] of queryResults) {
        results.forEach((result, rank) => {
            const existing = fusedScores.get(result.id);
            const rrfContribution = 1 / (k + rank + 1);

            if (existing) {
                existing.rrfScore += rrfContribution;
                existing.queryMatches.push(queryKey);
                existing.queryRanks[queryKey] = rank + 1;
            } else {
                fusedScores.set(result.id, {
                    result,
                    rrfScore: rrfContribution,
                    queryMatches: [queryKey],
                    queryRanks: { [queryKey]: rank + 1 },
                });
            }
        });
    }

    // Convert to array and sort by RRF score
    const fusedResults: RRFResult[] = Array.from(fusedScores.values())
        .map(({ result, rrfScore, queryMatches, queryRanks }) => ({
            ...result,
            rrfScore,
            queryMatches,
            queryRanks,
        }))
        .sort((a, b) => b.rrfScore - a.rrfScore);

    return fusedResults;
}

function calculateQueryCoverage(
    results: RRFResult[],
    totalQueries: number,
    topK: number = 10
): number {
    const topResults = results.slice(0, topK);
    const uniqueQueries = new Set<string>();

    topResults.forEach(r => {
        r.queryMatches.forEach(q => uniqueQueries.add(q));
    });

    return uniqueQueries.size / totalQueries;
}

export const handleGenerateQueryVariations = async ({ supabase, payload }: { supabase: any; payload: any }) => {
    const startTime = Date.now();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
        throw new Error('LOVABLE_API_KEY not configured');
    }

    const {
        query,
        context,
        numVariations = 3
    } = payload as QueryVariationRequest;

    if (!query) {
        throw new Error('Query is required');
    }

    console.log(`Generating ${numVariations} query variations for: "${query.slice(0, 50)}..."`);

    // Step 1: Generate query variations
    const { variations, types } = await generateVariations(
        query,
        context,
        numVariations,
        LOVABLE_API_KEY
    );

    const allQueries = [query, ...variations];
    const queryTypes = ['original', ...types];

    console.log(`Generated ${variations.length} variations:`, variations);

    // Step 2: Generate embeddings for all queries in parallel
    const embeddings = await Promise.all(
        allQueries.map(q => generateEmbedding(q, LOVABLE_API_KEY))
    );

    // Step 3: Search with all queries in parallel
    const searchPromises = allQueries.map((q, i) =>
        searchWithQuery(supabase, q, embeddings[i], 50)
            .then(results => ({ key: `query_${i}`, results }))
    );

    const searchResults = await Promise.all(searchPromises);

    // Build query results map
    const queryResultsMap = new Map<string, SearchResult[]>();
    searchResults.forEach(({ key, results }) => {
        queryResultsMap.set(key, results);
    });

    // Step 4: Apply Reciprocal Rank Fusion
    const fusedResults = reciprocalRankFusion(queryResultsMap);

    // Step 5: Calculate metrics
    const queryCoverage = calculateQueryCoverage(fusedResults, allQueries.length);
    const processingTimeMs = Date.now() - startTime;

    // Log to metrics table
    const queryId = crypto.randomUUID();
    try {
        await supabase.from('rag_evaluation_metrics').insert({
            query_id: queryId,
            original_query: query,
            query_variations: variations,
            total_candidates_retrieved: fusedResults.length,
            query_coverage: queryCoverage,
            rrf_scores: fusedResults.slice(0, 20).map((r: any) => r.rrfScore),
            retrieval_time_ms: processingTimeMs,
        });
    } catch (logError) {
        console.error('Failed to log metrics:', logError);
    }

    console.log(`Multi-query retrieval complete in ${processingTimeMs}ms. Coverage: ${(queryCoverage * 100).toFixed(1)}%`);

    return {
        queryId,
        originalQuery: query,
        variations,
        queryTypes,
        results: fusedResults.slice(0, 50).map(r => ({
            id: r.id,
            content: r.content,
            score: r.score,
            rrfScore: r.rrfScore,
            queryMatches: r.queryMatches,
            source_type: r.source_type,
            entity_id: r.entity_id,
        })),
        metrics: {
            totalQueries: allQueries.length,
            totalResults: fusedResults.length,
            queryCoverage,
            processingTimeMs,
            avgResultsPerQuery: searchResults.reduce(
                (sum, { results }) => sum + results.length, 0
            ) / allQueries.length,
        },
    };
};
