import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const EmbeddingSchema = z.object({
    text: z.string().min(1),
    entity_type: z.enum(['candidate', 'job', 'knowledge', 'interaction']).optional(),
    entity_id: z.string().uuid().optional(),
});

interface ActionContext {
    supabase: any;
    payload: any;
}

export async function handleGenerateEmbedding({ supabase, payload }: ActionContext) {
    const { text, entity_type, entity_id } = EmbeddingSchema.parse(payload);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: text,
            encoding_format: 'float',
        }),
    });

    if (!response.ok) throw new Error(`Embedding API error: ${response.status}`);

    const data = await response.json();
    const embedding = data.data?.[0]?.embedding;
    if (!embedding) throw new Error('No embedding returned');

    if (entity_type && entity_id) {
        let tableName: string, embeddingColumn: string;

        switch (entity_type) {
            case 'candidate': tableName = 'candidate_profiles'; embeddingColumn = 'profile_embedding'; break;
            case 'job': tableName = 'jobs'; embeddingColumn = 'job_embedding'; break;
            case 'knowledge': tableName = 'knowledge_base_articles'; embeddingColumn = 'content_embedding'; break;
            case 'interaction': tableName = 'company_interactions'; embeddingColumn = 'interaction_embedding'; break;
            default: throw new Error(`Unknown entity_type: ${entity_type}`);
        }

        const vectorString = `[${embedding.join(',')}]`;
        const { error } = await supabase.from(tableName)
            .update({ [embeddingColumn]: vectorString, embedding_generated_at: new Date().toISOString() })
            .eq('id', entity_id);

        if (error) throw new Error(`Database update failed: ${error.message}`);
    }

    return {
        embedding,
        dimensions: embedding.length,
        entity_type,
        entity_id
    };
}
