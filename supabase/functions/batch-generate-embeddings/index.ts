import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entity_type, limit = 100, offset = 0 } = await req.json();
    
    if (!entity_type) {
      throw new Error('entity_type is required (candidate, job, knowledge, interaction)');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log(`Batch generating embeddings for ${entity_type} (limit: ${limit}, offset: ${offset})`);

    let tableName: string;
    let embeddingColumn: string;
    let textColumn: string;
    let query: any;

    switch (entity_type) {
      case 'candidate':
        tableName = 'candidate_profiles';
        embeddingColumn = 'profile_embedding';
        query = supabase
          .from(tableName)
          .select('id, full_name, current_title, current_company, bio, location, skills_summary')
          .is(embeddingColumn, null)
          .range(offset, offset + limit - 1);
        break;
      case 'job':
        tableName = 'jobs';
        embeddingColumn = 'job_embedding';
        query = supabase
          .from(tableName)
          .select('id, title, department, location, description, requirements')
          .is(embeddingColumn, null)
          .range(offset, offset + limit - 1);
        break;
      case 'knowledge':
        tableName = 'knowledge_base_articles';
        embeddingColumn = 'content_embedding';
        query = supabase
          .from(tableName)
          .select('id, title, content, category')
          .is(embeddingColumn, null)
          .range(offset, offset + limit - 1);
        break;
      case 'interaction':
        tableName = 'company_interactions';
        embeddingColumn = 'interaction_embedding';
        query = supabase
          .from(tableName)
          .select('id, interaction_type, context, notes')
          .is(embeddingColumn, null)
          .range(offset, offset + limit - 1);
        break;
      default:
        throw new Error(`Unknown entity_type: ${entity_type}`);
    }

    const { data: entities, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch entities: ${fetchError.message}`);
    }

    if (!entities || entities.length === 0) {
      return new Response(
        JSON.stringify({ 
          processed: 0,
          message: 'No entities without embeddings found',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${entities.length} entities to process`);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process in batches to avoid overwhelming the API
    for (const entity of entities) {
      try {
        // Construct text based on entity type
        let text = '';
        switch (entity_type) {
          case 'candidate':
            text = `${entity.full_name || ''} ${entity.current_title || ''} at ${entity.current_company || ''}. ${entity.bio || ''} Located in ${entity.location || ''}. Skills: ${entity.skills_summary || ''}`;
            break;
          case 'job':
            text = `${entity.title || ''} in ${entity.department || ''}, ${entity.location || ''}. ${entity.description || ''} Requirements: ${entity.requirements || ''}`;
            break;
          case 'knowledge':
            text = `${entity.title || ''} (${entity.category || ''}): ${entity.content || ''}`;
            break;
          case 'interaction':
            text = `${entity.interaction_type || ''}: ${entity.context || ''} ${entity.notes || ''}`;
            break;
        }

        // Generate embedding
        const embeddingResponse = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: text.trim(),
            encoding_format: 'float',
          }),
        });

        if (!embeddingResponse.ok) {
          throw new Error(`API error: ${embeddingResponse.status}`);
        }

        const embeddingData = await embeddingResponse.json();
        const embedding = embeddingData.data[0].embedding;
        const vectorString = `[${embedding.join(',')}]`;

        // Update database
        const { error: updateError } = await supabase
          .from(tableName)
          .update({
            [embeddingColumn]: vectorString,
            embedding_generated_at: new Date().toISOString(),
          })
          .eq('id', entity.id);

        if (updateError) {
          throw new Error(`DB update error: ${updateError.message}`);
        }

        successCount++;
        console.log(`✓ Processed ${entity.id}`);

      } catch (error) {
        errorCount++;
        const errorMsg = `Failed ${entity.id}: ${error instanceof Error ? error.message : 'Unknown'}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Batch complete: ${successCount} success, ${errorCount} errors`);

    return new Response(
      JSON.stringify({ 
        processed: successCount,
        errors: errorCount,
        error_details: errors.slice(0, 10), // Return first 10 errors
        total_found: entities.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Batch embedding error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});