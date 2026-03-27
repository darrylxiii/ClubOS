import { createHandler } from '../_shared/handler.ts';

Deno.serve(createHandler(async (req, ctx) => {
    const { query, entity_type, limit = 10, threshold = 0.7 } = await req.json();

    if (!query) {
      throw new Error('Query text is required');
    }

    if (!entity_type) {
      throw new Error('entity_type is required (candidate, job, knowledge, interaction, meeting_candidate, meeting_job, meeting_interviewer)');
    }

    const supabase = ctx.supabase;

    // Generate embedding for the query
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
    if (!GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY not configured');
    }

    console.log(`Semantic search for: "${query}" in ${entity_type}`);

    const embeddingResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GOOGLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query,
        encoding_format: 'float',
      }),
    });

    if (!embeddingResponse.ok) {
      throw new Error(`Failed to generate query embedding: ${embeddingResponse.status}`);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // Determine table and column based on entity_type
    let tableName: string;
    let embeddingColumn: string;
    let selectColumns: string;
    let whereClause: string | null = null;

    switch (entity_type) {
      case 'candidate':
        tableName = 'candidate_profiles';
        embeddingColumn = 'profile_embedding';
        selectColumns = 'id, user_id, full_name, current_title, current_company, bio, location, profile_embedding';
        break;
      case 'job':
        tableName = 'jobs';
        embeddingColumn = 'job_embedding';
        selectColumns = 'id, title, department, location, description, requirements, job_embedding';
        break;
      case 'knowledge':
        tableName = 'knowledge_base_articles';
        embeddingColumn = 'content_embedding';
        selectColumns = 'id, title, content, category, search_keywords, content_embedding';
        break;
      case 'interaction':
        tableName = 'company_interactions';
        embeddingColumn = 'interaction_embedding';
        selectColumns = 'id, company_id, interaction_type, context, notes, interaction_embedding';
        break;
      // NEW: Meeting-specific entity types
      case 'meeting_candidate':
        tableName = 'intelligence_embeddings';
        embeddingColumn = 'embedding';
        selectColumns = 'id, entity_id, content, metadata, embedding';
        whereClause = "entity_type = 'meeting_candidate'";
        break;
      case 'meeting_job':
        tableName = 'intelligence_embeddings';
        embeddingColumn = 'embedding';
        selectColumns = 'id, entity_id, content, metadata, embedding';
        whereClause = "entity_type = 'meeting_job'";
        break;
      case 'meeting_interviewer':
        tableName = 'intelligence_embeddings';
        embeddingColumn = 'embedding';
        selectColumns = 'id, entity_id, content, metadata, embedding';
        whereClause = "entity_type = 'meeting_interviewer'";
        break;
      default:
        throw new Error(`Unknown entity_type: ${entity_type}. Valid types: candidate, job, knowledge, interaction, meeting_candidate, meeting_job, meeting_interviewer`);
    }

    // Perform vector similarity search using pgvector
    // Using cosine distance operator <=> (lower is better)
    const vectorString = `[${queryEmbedding.join(',')}]`;
    
    // Extract entity_type for filter if this is an intelligence_embeddings query
    const filterEntityType = ['meeting_candidate', 'meeting_job', 'meeting_interviewer'].includes(entity_type) 
      ? entity_type 
      : null;
    
    const { data, error } = await supabase.rpc('semantic_search_query', {
      query_embedding: vectorString,
      match_table: tableName,
      match_column: embeddingColumn,
      match_threshold: threshold, // Use threshold directly (function expects similarity threshold)
      match_count: limit,
      filter_entity_type: filterEntityType,
    });

    if (error) {
      // Fallback to direct query if RPC not available
      console.log('RPC not available, using direct query:', error.message);
      
      let query = supabase
        .from(tableName)
        .select(selectColumns)
        .not(embeddingColumn, 'is', null);
      
      // Apply entity_type filter for intelligence_embeddings table
      if (tableName === 'intelligence_embeddings' && whereClause) {
        const entityTypeMatch = whereClause.match(/entity_type\s*=\s*'([^']+)'/);
        if (entityTypeMatch) {
          query = query.eq('entity_type', entityTypeMatch[1]);
        }
      }
      
      const { data: directData, error: directError } = await query.limit(limit);

      if (directError) {
        throw new Error(`Search failed: ${directError.message}`);
      }

      // Calculate similarity scores manually
      const results = (directData || []).map((row: any) => {
        const embedding = row[embeddingColumn];
        // Calculate cosine similarity
        let similarity = 0;
        if (embedding && Array.isArray(embedding)) {
          const dotProduct = embedding.reduce((sum: number, val: number, i: number) => 
            sum + val * queryEmbedding[i], 0);
          const magnitudeA = Math.sqrt(embedding.reduce((sum: number, val: number) => 
            sum + val * val, 0));
          const magnitudeB = Math.sqrt(queryEmbedding.reduce((sum: number, val: number) => 
            sum + val * val, 0));
          similarity = dotProduct / (magnitudeA * magnitudeB);
        }
        
        return {
          ...row,
          similarity_score: similarity,
        };
      })
      .filter((row: any) => row.similarity_score >= threshold)
      .sort((a: any, b: any) => b.similarity_score - a.similarity_score)
      .slice(0, limit);

      return new Response(
        JSON.stringify({ 
          results,
          query,
          entity_type,
          count: results.length,
        }),
        { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${data?.length || 0} results`);

    return new Response(
      JSON.stringify({ 
        results: data || [],
        query,
        entity_type,
        count: data?.length || 0,
      }),
      { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
    );

}));