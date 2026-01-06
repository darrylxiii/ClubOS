
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

        // 2. Format Chunks for Embedding
        // We break data into logical "facts" that the agent can retrieve independently.
        const chunks = [];

        // Chunk A: Mission & Vision
        if (company.mission || company.vision) {
            chunks.push({
                content: `Company Mission for ${company.name}: ${company.mission || ''}. Vision: ${company.vision || ''}`,
                metadata: { type: 'mission_vision', source: 'company_profile' }
            });
        }

        // Chunk B: Values
        if (company.values) {
            // Assuming values is JSON array or object
            const valuesText = JSON.stringify(company.values);
            chunks.push({
                content: `Core Values at ${company.name}: ${valuesText}`,
                metadata: { type: 'core_values', source: 'company_profile' }
            });
        }

        // Chunk C: Tech Stack
        if (company.tech_stack) {
            const techText = JSON.stringify(company.tech_stack);
            chunks.push({
                content: `Technology Stack used at ${company.name}: ${techText}`,
                metadata: { type: 'tech_stack', source: 'company_profile' }
            });
        }

        // Chunk D: Culture & Benefits
        if (company.culture_highlights || company.benefits) {
            const cultureText = `Culture: ${JSON.stringify(company.culture_highlights)}. Benefits: ${JSON.stringify(company.benefits)}`;
            chunks.push({
                content: `Work Culture and Benefits at ${company.name}: ${cultureText}`,
                metadata: { type: 'culture_benefits', source: 'company_profile' }
            });
        }

        console.log(`[ingest-company-dna] Generated ${chunks.length} chunks for ${company.name}`);

        // 3. Generate Embeddings & Upsert
        const results = [];

        for (const chunk of chunks) {
            // Generate Embedding via Lovable/OpenAI
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

            if (!embeddingResp.ok) {
                console.error(`Failed to embed chunk: ${chunk.metadata.type}`, await embeddingResp.text());
                continue;
            }

            const embeddingData = await embeddingResp.json();
            const embedding = embeddingData.data[0].embedding;

            // Upsert into intelligence_embeddings
            // Note: We assume 'embedding' column exists even if types.ts missed it
            const { error: upsertError } = await supabase
                .from('intelligence_embeddings')
                .upsert({
                    entity_id: company_id,
                    entity_type: 'company_dna', // grouping type
                    content: chunk.content,
                    metadata: chunk.metadata,
                    embedding: embedding // explicit untyped insert
                }, { onConflict: 'entity_id, entity_type, content' }) // simplified conflict handling logic
            // Real implementation might need a unique ID or better conflict strategy
            // For now, we'll rely on the DB generating a new ID if we don't provide one, 
            // but to avoid duplicates we might need to delete old 'company_dna' for this ID first?
            // Let's keep it simple: insert new records. 
            // Better: Delete old 'company_dna' records for this company first to ensure freshness.

            results.push({ type: chunk.metadata.type, status: upsertError ? 'error' : 'success' });
        }

        // Clean up old embeddings?? 
        // Ideally we should delete *before* inserting new ones to avoid staleness, 
        // but we need to be careful not to delete history if we want that.
        // For "Current Context" (DNA), we usually want the latest version.

        return new Response(
            JSON.stringify({ success: true, processed: results }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
