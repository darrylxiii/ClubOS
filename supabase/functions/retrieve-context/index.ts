import { createHandler } from '../_shared/handler.ts';

Deno.serve(createHandler(async (req, ctx) => {
        const googleApiKey = Deno.env.get('GOOGLE_API_KEY');

        if (!googleApiKey) {
            throw new Error('GOOGLE_API_KEY is not set');
        }

        const supabase = ctx.supabase;
        const { query, company_id, user_id, job_id } = await req.json();

        if (!query) {
            throw new Error('Query is required');
        }

        // Fetch Hierarchical Knowledge Profiles (Voice & Insturctions)
        let knowledgeContext = {
            user: null,
            job: null,
            company: null
        };

        try {
            const entitiesToCheck = [];
            if (user_id) entitiesToCheck.push({ id: user_id, type: 'user' });
            if (job_id) entitiesToCheck.push({ id: job_id, type: 'job' });
            if (company_id) entitiesToCheck.push({ id: company_id, type: 'company' });

            if (entitiesToCheck.length > 0) {
                const { data: profiles } = await supabase
                    .from('knowledge_profiles')
                    .select('*')
                    .in('entity_id', entitiesToCheck.map(e => e.id));

                if (profiles) {
                    profiles.forEach((p: any) => {
                        // Simple mapping since we requested by IDs. strict types would check entity_type too.
                        if (p.entity_type === 'user' && p.entity_id === user_id) knowledgeContext.user = p;
                        if (p.entity_type === 'job' && p.entity_id === job_id) knowledgeContext.job = p;
                        if (p.entity_type === 'company' && p.entity_id === company_id) knowledgeContext.company = p;
                    });
                }
            }
        } catch (e) {
            console.warn('Failed to fetch knowledge profiles', e);
        }

        // 0. Query Expansion — ONLY for complex queries (>8 words) to save AI credits
        let optimizedQuery = query;
        let graphEntities: string[] = [];

        const wordCount = query.trim().split(/\s+/).length;
        const isComplexQuery = wordCount > 8;

        if (isComplexQuery) {
            try {
                const expansionResp = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${googleApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'gemini-2.5-flash-lite', // Cheapest model for query expansion
                        messages: [
                            {
                                role: 'system',
                                content: `Rewrite the user query for vector search and extract key entities. Output JSON: { "rewritten": "string", "entities": ["react", "google"] }`
                            },
                            { role: 'user', content: query }
                        ],
                        response_format: { type: "json_object" }
                    })
                });

                if (expansionResp.ok) {
                    const expansionData = await expansionResp.json();
                    const content = JSON.parse(expansionData.choices[0].message.content);
                    optimizedQuery = content.rewritten || query;
                    graphEntities = content.entities || [];
                    console.log(`[Brain] Expanded: "${optimizedQuery}", Entities:`, graphEntities);
                }
            } catch (e) {
                console.warn('Query expansion failed, falling back to original query', e);
            }
        } else {
            console.log(`[Brain] Simple query (${wordCount} words) — skipping expansion AI call`);
        }

        // 1. Generate Embedding for the Otimized Query
        const embeddingResp = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/embeddings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${googleApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'text-embedding-3-small',
                input: optimizedQuery,
                encoding_format: 'float'
            })
        });

        if (!embeddingResp.ok) {
            throw new Error(`Failed to generate query embedding: ${await embeddingResp.text()}`);
        }

        const embeddingData = await embeddingResp.json();
        const queryEmbedding = embeddingData.data[0].embedding;

        // 2a. Perform Hybrid Search (Vector + Keyword)
        const { data: vectorContext, error: searchError } = await supabase
            .rpc('search_universal_context', {
                query_text: optimizedQuery, // Use optimized query for keyword match too
                query_embedding: queryEmbedding,
                match_threshold: 0.3, // Lower threshold to get more candidates
                match_count: 10,       // Get top 10 for reranking
                full_text_weight: 1.0,
                semantic_weight: 1.0
            });

        if (searchError) throw new Error(`Hybrid search failed: ${searchError.message}`);

        // 2b. Perform Graph Search (GraphRAG)
        let graphContext: any[] = [];
        if (graphEntities.length > 0) {
            const { data: graphData, error: graphError } = await supabase
                .rpc('match_entity_relationships', {
                    entities: graphEntities,
                    match_threshold: 0.5
                });

            if (!graphError && graphData) {
                // Format graph results to look like context chunks
                graphContext = graphData.map((g: any) => ({
                    content: `[Graph Fact] ${g.content}`,
                    similarity: g.similarity, // Use strength score as similarity
                    metadata: { type: 'graph_fact', source: 'knowledge_graph', ...g }
                }));
                console.log(`[Brain] Graph Walk found ${graphContext.length} facts`);
            }
        }

        // Merge Vector + Graph candidates
        let candidates = [...(vectorContext || []), ...graphContext];

        // 3. Reranking (New Step)
        // Use LLM to pick the top 5 most relevant chunks
        // This acts as a Cross-Encoder replacement
        let finalResults = candidates;

        // Only rerank if we have many candidates (>5) — otherwise just take top 5 by vector score
        if (candidates.length > 5) {
            try {
                const rerankPrompt = `Relevance Ranker. Query: "${query}"\nCandidates:\n${candidates.map((c: any, i: number) => `[${i}] ${c.content.substring(0, 200)}`).join('\n')}\nReturn JSON: {"indices": [0, 3, 1]} (top 5 most relevant)`;

                const rerankResp = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${googleApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'gemini-2.5-flash-lite', // Cheapest model for reranking
                        messages: [{ role: 'user', content: rerankPrompt }],
                        response_format: { type: "json_object" }
                    })
                });

                if (rerankResp.ok) {
                    const rerankData = await rerankResp.json();
                    const indices = JSON.parse(rerankData.choices[0].message.content).indices || [];
                    if (Array.isArray(indices) && indices.length > 0) {
                        finalResults = indices
                            .map((idx: number) => candidates[idx])
                            .filter((c: any) => c !== undefined);
                    }
                }
            } catch (e) {
                console.warn('Reranking failed, falling back to vector order', e);
                finalResults = candidates.slice(0, 5);
            }
        } else {
            console.log(`[Brain] Only ${candidates.length} candidates — skipping reranking AI call`);
        }

        // Ensure we don't return too many if reranking failed or returned all
        finalResults = finalResults.slice(0, 5);

        // Log for debugging "Brain" thought process
        console.log(`[Brain] Query: "${query}" -> Found ${finalResults.length} matches (Vector: ${vectorContext?.length || 0}, Graph: ${graphContext.length})`);

        return new Response(
            JSON.stringify({
                matches: finalResults,
                knowledge_context: knowledgeContext,
                thought_process: {
                    original_query: query,
                    optimized_query: optimizedQuery,
                    extracted_entities: graphEntities,
                    candidate_count: candidates.length,
                    final_count: finalResults.length,
                    strategy: "Query Expansion -> Hybrid Search + Graph Walk -> LLM Reranking"
                }
            }),
            { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
        );
}));
