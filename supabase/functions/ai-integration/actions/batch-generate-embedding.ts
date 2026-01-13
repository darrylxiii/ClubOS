import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const BatchEmbeddingSchema = z.object({
    entity_type: z.enum(['candidate', 'job', 'knowledge', 'interaction']),
    limit: z.number().default(100),
    offset: z.number().default(0),
});

interface ActionContext {
    supabase: any;
    payload: any;
}

export async function handleBatchGenerateEmbedding({ supabase, payload }: ActionContext) {
    const { entity_type, limit, offset } = BatchEmbeddingSchema.parse(payload);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    let tableName: string, textColumn: string, embeddingColumn: string;
    switch (entity_type) {
        case 'candidate': tableName = 'candidate_profiles'; textColumn = 'bio'; embeddingColumn = 'profile_embedding'; break;
        case 'job': tableName = 'jobs'; textColumn = 'description'; embeddingColumn = 'job_embedding'; break;
        case 'knowledge': tableName = 'knowledge_base_articles'; textColumn = 'content'; embeddingColumn = 'content_embedding'; break;
        case 'interaction': tableName = 'company_interactions'; textColumn = 'context'; embeddingColumn = 'interaction_embedding'; break;
        default: throw new Error(`Unknown entity_type: ${entity_type}`);
    }

    // Fetch items without embeddings
    const { data: items, error: fetchError } = await supabase
        .from(tableName)
        .select(`id, ${textColumn}`)
        .is(embeddingColumn, null)
        .range(offset, offset + limit - 1);

    if (fetchError) throw new Error(`Fetch failed: ${fetchError.message}`);
    if (!items || items.length === 0) return { processed: 0, errors: 0 };

    console.log(`Processing ${items.length} items for ${entity_type}`);

    let processed = 0;
    let errors = 0;

    // Process in serial chunks to avoid rate limits (or parallel if low volume)
    // For simplicity and safety in this migration, strict serial or small batches.
    // Porting logic: Original likely looped.

    for (const item of items) {
        const text = item[textColumn];
        if (!text || text.length < 10) {
            errors++;
            continue;
        }

        try {
            const embResponse = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: 'text-embedding-3-small', input: text, encoding_format: 'float' }),
            });

            if (!embResponse.ok) throw new Error('API Error');
            const embData = await embResponse.json();
            const embedding = embData.data?.[0]?.embedding;

            if (embedding) {
                const vectorString = `[${embedding.join(',')}]`;
                await supabase.from(tableName)
                    .update({ [embeddingColumn]: vectorString, embedding_generated_at: new Date().toISOString() })
                    .eq('id', item.id);
                processed++;
            } else {
                errors++;
            }
        } catch (e) {
            console.error(`Error processing item ${item.id}:`, e);
            errors++;
        }
        // Simple rate limit buffer
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    return { processed, errors };
}
