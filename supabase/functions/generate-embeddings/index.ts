import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { checkUserRateLimit, createRateLimitResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting: 20 requests per hour per IP/user
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     "unknown";
    
    const rateLimitResult = await checkUserRateLimit(clientIp, "generate-embeddings", 20, 3600000);
    if (!rateLimitResult.allowed) {
      console.log(`[Embeddings] Rate limit exceeded for IP: ${clientIp}`);
      return createRateLimitResponse(rateLimitResult.retryAfter || 3600, corsHeaders);
    }

    const { text, entity_type, entity_id } = await req.json();
    
    if (!text) {
      throw new Error('Text is required');
    }

    // Use Lovable AI to generate embeddings
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log(`Generating embedding for ${entity_type}:${entity_id}`);

    // Call OpenAI-compatible embeddings API via Lovable AI Gateway
    const embeddingResponse = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
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

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error('Embedding API error:', errorText);
      throw new Error(`Failed to generate embedding: ${embeddingResponse.status}`);
    }

    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData.data[0].embedding;

    console.log(`Generated embedding with ${embedding.length} dimensions`);

    // If entity_type and entity_id provided, update the database
    if (entity_type && entity_id) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      let tableName: string;
      let embeddingColumn: string;

      switch (entity_type) {
        case 'candidate':
          tableName = 'candidate_profiles';
          embeddingColumn = 'profile_embedding';
          break;
        case 'job':
          tableName = 'jobs';
          embeddingColumn = 'job_embedding';
          break;
        case 'knowledge':
          tableName = 'knowledge_base_articles';
          embeddingColumn = 'content_embedding';
          break;
        case 'interaction':
          tableName = 'company_interactions';
          embeddingColumn = 'interaction_embedding';
          break;
        default:
          throw new Error(`Unknown entity_type: ${entity_type}`);
      }

      // Convert embedding array to PostgreSQL vector format
      const vectorString = `[${embedding.join(',')}]`;

      const { error: updateError } = await supabase
        .from(tableName)
        .update({
          [embeddingColumn]: vectorString,
          embedding_generated_at: new Date().toISOString(),
        })
        .eq('id', entity_id);

      if (updateError) {
        console.error('Database update error:', updateError);
        throw new Error(`Failed to update database: ${updateError.message}`);
      }

      console.log(`Updated ${tableName}:${entity_id} with embedding`);
    }

    return new Response(
      JSON.stringify({ 
        embedding,
        dimensions: embedding.length,
        entity_type,
        entity_id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating embeddings:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});