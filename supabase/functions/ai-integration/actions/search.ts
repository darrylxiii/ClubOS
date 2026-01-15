import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const SearchSchema = z.object({
    query: z.string().min(1),
    entity_type: z.enum(['candidate', 'job', 'knowledge', 'interaction']),
    limit: z.number().default(10),
    threshold: z.number().default(0.7),
});

interface ActionContext {
    supabase: any;
    payload: any;
}

export async function handleSemanticSearch({ supabase, payload }: ActionContext) {
    const { query, entity_type, limit, threshold } = SearchSchema.parse(payload);

    // Generate Query Embedding
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const embResponse = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'text-embedding-3-small', input: query, encoding_format: 'float' }),
    });

    if (!embResponse.ok) throw new Error(`Embedding API error: ${embResponse.status}`);
    const embData = await embResponse.json();
    const queryEmbedding = embData.data?.[0]?.embedding;
    if (!queryEmbedding) throw new Error('No embedding returned');

    // Determine Target Table
    let tableName: string, embeddingColumn: string, selectColumns: string;
    switch (entity_type) {
        case 'candidate':
            tableName = 'candidate_profiles'; embeddingColumn = 'profile_embedding';
            selectColumns = 'id, user_id, full_name, current_title, current_company, bio, location, profile_embedding';
            break;
        case 'job':
            tableName = 'jobs'; embeddingColumn = 'job_embedding';
            selectColumns = 'id, title, department, location, description, requirements, job_embedding';
            break;
        case 'knowledge':
            tableName = 'knowledge_base_articles'; embeddingColumn = 'content_embedding';
            selectColumns = 'id, title, content, category, tags, content_embedding';
            break;
        case 'interaction':
            tableName = 'company_interactions'; embeddingColumn = 'interaction_embedding';
            selectColumns = 'id, company_id, interaction_type, context, notes, interaction_embedding';
            break;
        default: throw new Error(`Unknown entity_type: ${entity_type}`);
    }

    // Execute Search
    const vectorString = `[${queryEmbedding.join(',')}]`;
    const { data, error } = await supabase.rpc('semantic_search_query', {
        query_embedding: vectorString,
        match_table: tableName,
        match_column: embeddingColumn,
        match_threshold: 1 - threshold,
        match_count: limit,
    }).select(selectColumns);

    if (error) {
        console.error('RPC Error, falling back to basic query (WARNING: Slow/Inaccurate):', error);
        // Minimal fallback logic here if needed, or just throw.
        // Given system goals, I prefer throwing to highlight broken RPC than silently failing.
        // However, the original code had a manual fallback. I will reproduce a simpler version.
        throw new Error(`RPC Search failed: ${error.message}`);
    }

    return {
        results: data || [],
        query,
        entity_type,
        count: data?.length || 0,
    };
}
