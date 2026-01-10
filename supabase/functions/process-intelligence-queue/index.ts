import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QueueItem {
  id: string;
  entity_type: string;
  entity_id: string;
  processing_type: string;
  priority: number;
  metadata: Record<string, unknown>;
  attempts: number;
}

interface ProcessResult {
  success: boolean;
  error?: { message: string };
}

// Generate embedding for communication records
async function generateCommunicationEmbedding(
  supabase: SupabaseClient,
  item: QueueItem
): Promise<ProcessResult> {
  // Fetch the unified communication record
  const { data: comm, error } = await supabase
    .from('unified_communications')
    .select('*')
    .eq('id', item.entity_id)
    .single();

  if (error || !comm) {
    return { success: false, error: { message: `Communication not found: ${item.entity_id}` } };
  }

  // Build rich text for embedding
  const textParts: string[] = [];
  
  if (comm.subject) {
    textParts.push(`Subject: ${comm.subject}`);
  }
  
  textParts.push(`Channel: ${comm.channel}`);
  textParts.push(`Direction: ${comm.direction}`);
  textParts.push(`Type: ${comm.entity_type}`);
  
  if (comm.content_preview) {
    textParts.push(`Content: ${comm.content_preview}`);
  }

  const textForEmbedding = textParts.join('\n');

  // Try to generate embedding via existing function
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const embeddingResponse = await fetch(
    `${supabaseUrl}/functions/v1/generate-embeddings`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ 
        text: textForEmbedding,
        entity_type: 'communication',
        entity_id: item.entity_id
      }),
    }
  );

  if (!embeddingResponse.ok) {
    // Store in intelligence_embeddings without vector for later processing
    console.warn("Embedding service unavailable, storing for later processing");
    
    await supabase.from('intelligence_embeddings').upsert({
      entity_type: 'communication',
      entity_id: item.entity_id,
      content: textForEmbedding,
      content_type: 'communication',
      metadata: {
        channel: comm.channel,
        direction: comm.direction,
        entity_type: comm.entity_type,
        entity_id: comm.entity_id,
        original_timestamp: comm.original_timestamp,
        sentiment_score: comm.sentiment_score,
        source_table: item.metadata?.source_table,
        source_id: item.metadata?.source_id,
        pending_embedding: true
      }
    }, {
      onConflict: 'entity_type,entity_id'
    });
    
    return { success: true };
  }

  const embeddingData = await embeddingResponse.json();

  // Store in intelligence_embeddings with vector
  await supabase.from('intelligence_embeddings').upsert({
    entity_type: 'communication',
    entity_id: item.entity_id,
    content: textForEmbedding,
    content_type: 'communication',
    embedding: embeddingData.embedding,
    metadata: {
      channel: comm.channel,
      direction: comm.direction,
      entity_type: comm.entity_type,
      entity_id: comm.entity_id,
      original_timestamp: comm.original_timestamp,
      sentiment_score: comm.sentiment_score,
      source_table: item.metadata?.source_table,
      source_id: item.metadata?.source_id
    }
  }, {
    onConflict: 'entity_type,entity_id'
  });

  return { success: true };
}

// Extract facts from communication using AI
async function extractCommunicationFacts(
  supabase: SupabaseClient,
  item: QueueItem
): Promise<ProcessResult> {
  const { data: comm, error } = await supabase
    .from('unified_communications')
    .select('*')
    .eq('id', item.entity_id)
    .single();

  if (error || !comm) {
    return { success: false, error: { message: `Communication not found: ${item.entity_id}` } };
  }

  // Skip if content is too short
  if (!comm.content_preview || comm.content_preview.length < 50) {
    return { success: true };
  }

  // Use AI to extract facts (via club-ai-chat or similar)
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const aiResponse = await fetch(
    `${supabaseUrl}/functions/v1/club-ai-chat`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        message: `Extract key facts from this ${comm.channel} communication. Return ONLY a JSON array of objects with: fact (string), category (one of: preference, commitment, deadline, budget, relationship), confidence (number 0-1). No other text.

Content: ${comm.content_preview}`,
        context: { extractionMode: true, systemOnly: true }
      }),
    }
  );

  if (!aiResponse.ok) {
    console.warn("AI service unavailable for fact extraction");
    return { success: true }; // Non-critical, don't fail
  }

  const aiData = await aiResponse.json();
  
  try {
    // Parse facts from AI response
    const factsMatch = aiData.response?.match(/\[[\s\S]*?\]/);
    if (factsMatch) {
      const facts = JSON.parse(factsMatch[0]);
      
      for (const fact of facts) {
        if (fact.confidence >= 0.6 && comm.entity_id) {
          await supabase.from('ai_memory').insert({
            user_id: comm.entity_id,
            memory_type: fact.category || 'general',
            content: fact.fact,
            context: {
              source: 'communication',
              channel: comm.channel,
              communication_id: comm.id,
              extracted_at: new Date().toISOString()
            },
            relevance_score: fact.confidence
          });
        }
      }
    }
  } catch (parseError) {
    console.warn("Could not parse facts from AI response:", parseError);
  }

  return { success: true };
}

// Analyze sentiment of communication
async function analyzeCommunicationSentiment(
  supabase: SupabaseClient,
  item: QueueItem
): Promise<ProcessResult> {
  const { data: comm, error } = await supabase
    .from('unified_communications')
    .select('*')
    .eq('id', item.entity_id)
    .single();

  if (error || !comm) {
    return { success: false, error: { message: `Communication not found: ${item.entity_id}` } };
  }

  // Skip if already has sentiment or content is too short
  if (comm.sentiment_score !== null || !comm.content_preview || comm.content_preview.length < 20) {
    return { success: true };
  }

  // Simple sentiment analysis using keyword matching
  const content = comm.content_preview.toLowerCase();
  
  const positiveWords = ['thank', 'great', 'excellent', 'happy', 'pleased', 'excited', 'love', 'wonderful', 'perfect', 'amazing', 'fantastic', 'appreciate', 'helpful', 'brilliant'];
  const negativeWords = ['sorry', 'unfortunately', 'problem', 'issue', 'disappointed', 'frustrated', 'concerned', 'worried', 'difficult', 'wrong', 'bad', 'terrible', 'awful', 'complaint'];
  
  let score = 0;
  positiveWords.forEach(word => {
    if (content.includes(word)) score += 0.1;
  });
  negativeWords.forEach(word => {
    if (content.includes(word)) score -= 0.1;
  });
  
  // Normalize to -1 to 1 range
  const sentimentScore = Math.max(-1, Math.min(1, score));

  // Update the unified communication
  await supabase
    .from('unified_communications')
    .update({ sentiment_score: sentimentScore })
    .eq('id', item.entity_id);

  return { success: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { batch_size = 10 } = await req.json();

    console.log(`Processing intelligence queue (batch size: ${batch_size})`);

    // Get pending items ordered by priority
    const { data: queueItems, error: fetchError } = await supabase
      .from('intelligence_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', 3)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(batch_size);

    if (fetchError) throw fetchError;
    if (!queueItems || queueItems.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No items to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${queueItems.length} items to process`);

    let successCount = 0;
    let failCount = 0;

    for (const item of queueItems) {
      try {
        // Mark as processing
        await supabase
          .from('intelligence_queue')
          .update({ status: 'processing', attempts: item.attempts + 1 })
          .eq('id', item.id);

        let result: ProcessResult;

        // Route to appropriate processor
        switch (item.processing_type) {
          case 'generate_embedding': {
            // Handle communication embeddings differently
            if (item.entity_type === 'communication') {
              result = await generateCommunicationEmbedding(supabase, item);
            } else {
              const entityType = item.entity_type === 'candidate_profiles' ? 'candidate' : 'job';
              const invokeResult = await supabase.functions.invoke('generate-embeddings', {
                body: {
                  entity_type: entityType,
                  entity_id: item.entity_id
                }
              });
              result = invokeResult.error 
                ? { success: false, error: { message: invokeResult.error.message } }
                : { success: true };
            }
            break;
          }

          case 'extract_facts': {
            result = await extractCommunicationFacts(supabase, item);
            break;
          }

          case 'analyze_sentiment': {
            result = await analyzeCommunicationSentiment(supabase, item);
            break;
          }

          case 'extract_insights': {
            const invokeResult = await supabase.functions.invoke('extract-interaction-insights', {
              body: {
                interaction_id: item.entity_id
              }
            });
            result = invokeResult.error 
              ? { success: false, error: { message: invokeResult.error.message } }
              : { success: true };
            break;
          }

          case 'update_training_label': {
            const invokeResult = await supabase.functions.invoke('track-ml-outcome', {
              body: {
                application_id: item.entity_id
              }
            });
            result = invokeResult.error 
              ? { success: false, error: { message: invokeResult.error.message } }
              : { success: true };
            break;
          }

          default:
            throw new Error(`Unknown processing type: ${item.processing_type}`);
        }

        if (!result.success && result.error) {
          throw new Error(result.error.message);
        }

        // Mark as completed
        await supabase
          .from('intelligence_queue')
          .update({ 
            status: 'completed',
            processed_at: new Date().toISOString()
          })
          .eq('id', item.id);

        successCount++;
        console.log(`✓ Processed ${item.processing_type} for ${item.entity_type}:${item.entity_id}`);

      } catch (error) {
        console.error(`✗ Failed ${item.processing_type}:`, error);
        
        // Mark as failed
        await supabase
          .from('intelligence_queue')
          .update({ 
            status: item.attempts + 1 >= 3 ? 'failed' : 'pending',
            error_message: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('id', item.id);

        failCount++;
      }
    }

    return new Response(
      JSON.stringify({
        processed: queueItems.length,
        success: successCount,
        failed: failCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-intelligence-queue:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
