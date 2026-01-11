import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple text splitter function
function splitText(text: string, chunkSize: number = 800, overlap: number = 200): string[] {
    if (text.length <= chunkSize) return [text];

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
        let end = start + chunkSize;

        // Try to break at a period or newline if possible within the last 100 chars of the chunk
        if (end < text.length) {
            const lastPeriod = text.lastIndexOf('.', end);
            const lastNewline = text.lastIndexOf('\n', end);
            const breakPoint = Math.max(lastPeriod, lastNewline);

            if (breakPoint > start + chunkSize - 200) {
                end = breakPoint + 1;
            }
        }

        chunks.push(text.substring(start, end).trim());

        // Move start for next chunk (minus overlap)
        start = end - overlap;
    }

    return chunks;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

        if (!lovableApiKey) {
            throw new Error('LOVABLE_API_KEY is not set');
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { company_id } = await req.json();

        if (!company_id) {
            throw new Error('company_id is required');
        }

        // 1. Fetch Company DNA
        const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('name, mission, vision, values, culture_highlights, tech_stack, benefits')
            .eq('id', company_id)
            .single();

        if (companyError || !company) {
            throw new Error(`Failed to fetch company: ${companyError?.message}`);
        }

        // 2. Format Chunks for Embedding (Advanced)
        const chunks = [];

        // Chunk A: Identity (Mission + Vision)
        if (company.mission || company.vision) {
            const identityText = `Company Identity for ${company.name}.\nMission: ${company.mission || 'N/A'}\nVision: ${company.vision || 'N/A'}`;
            chunks.push({
                content: identityText,
                metadata: { type: 'identity', source: 'company_profile', company_name: company.name }
            });
        }

        // Chunk B: Core Values
        if (company.values) {
            const valuesStr = Array.isArray(company.values)
                ? company.values.map((v: any) => `${v.title || v}: ${v.description || ''}`).join('\n')
                : JSON.stringify(company.values);

            const valueChunks = splitText(`Core Values of ${company.name}:\n${valuesStr}`, 1000, 200);
            valueChunks.forEach((txt, idx) => {
                chunks.push({
                    content: txt,
                    metadata: { type: 'core_values', source: 'company_profile', chunk_index: idx }
                });
            });
        }

        // Chunk C: Tech Stack
        if (company.tech_stack) {
            const techStr = Array.isArray(company.tech_stack) ? company.tech_stack.join(', ') : JSON.stringify(company.tech_stack);
            chunks.push({
                content: `Technology Stack used at ${company.name}: ${techStr}`,
                metadata: { type: 'tech_stack', source: 'company_profile' }
            });
        }

        // Chunk D: Culture
        if (company.culture_highlights) {
            const cultureStr = Array.isArray(company.culture_highlights) ? company.culture_highlights.join('\n') : String(company.culture_highlights);
            const cultureChunks = splitText(`Work Culture at ${company.name}:\n${cultureStr}`, 800, 200);

            cultureChunks.forEach((txt, idx) => {
                chunks.push({
                    content: txt,
                    metadata: { type: 'culture', source: 'company_profile', chunk_index: idx }
                });
            });
        }

        // Chunk E: Benefits
        if (company.benefits) {
            const benefitsStr = Array.isArray(company.benefits) ? company.benefits.join('\n') : String(company.benefits);
            const benefitChunks = splitText(`Employee Benefits at ${company.name}:\n${benefitsStr}`, 800, 200);

            benefitChunks.forEach((txt, idx) => {
                chunks.push({
                    content: txt,
                    metadata: { type: 'benefits', source: 'company_profile', chunk_index: idx }
                });
            });
        }

        console.log(`[ingest-company-dna] Generated ${chunks.length} chunks for ${company.name}`);

        // 3. Delete old embeddings to avoid staleness
        await supabase
            .from('intelligence_embeddings')
            .delete()
            .eq('entity_id', company_id)
            .eq('entity_type', 'company_dna');

        const results = [];

        // 4. Process in batches
        for (let i = 0; i < chunks.length; i += 5) {
            const batch = chunks.slice(i, i + 5);
            await Promise.all(batch.map(async (chunk) => {
                try {
                    const embeddingResp = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${lovableApiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            model: 'text-embedding-3-small',
                            input: chunk.content,
                            encoding_format: 'float'
                        })
                    });

                    if (!embeddingResp.ok) throw new Error(await embeddingResp.text());

                    const embeddingData = await embeddingResp.json();

                    const { error } = await supabase
                        .from('intelligence_embeddings')
                        .insert({
                            entity_id: company_id,
                            entity_type: 'company_dna',
                            content: chunk.content,
                            metadata: chunk.metadata,
                            embedding: embeddingData.data[0].embedding
                        });

                    results.push({ content: chunk.content.substring(0, 50), status: error ? 'error' : 'success' });
                } catch (e: any) {
                    console.error("Embedding error", e);
                    results.push({ content: chunk.content.substring(0, 50), status: 'error', error: e.message });
                }
            }));
        }

        return new Response(
            JSON.stringify({ success: true, processed: results }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error:', error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
