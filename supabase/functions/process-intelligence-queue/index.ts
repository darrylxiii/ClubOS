import { createHandler } from '../_shared/handler.ts';
import type { SupabaseClient } from '../_shared/handler.ts';

interface QueueItem {
  id: string;
  entity_type: string;
  entity_id: string;
  processing_type: string;
  priority: number;
  metadata: Record<string, unknown>;
  attempts: number;
  status: string;
  locked_by: string | null;
}

interface ProcessResult {
  success: boolean;
  error?: { message: string };
}

const LOG_PREFIX = '[process-intelligence-queue]';

Deno.serve(createHandler(async (req, ctx) => {
  const supabase = ctx.supabase;
  const { batch_size = 25 } = await req.json().catch(() => ({}));
  const lockId = `piq_${crypto.randomUUID().slice(0, 8)}`;

  console.log(`${LOG_PREFIX} Processing batch (size: ${batch_size}, lock: ${lockId})`);

  // Lock pending items atomically
  const { data: queueItems, error: fetchError } = await supabase
    .from('intelligence_queue')
    .select('*')
    .eq('status', 'pending')
    .is('locked_by', null)
    .lt('attempts', 3)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(batch_size);

  if (fetchError) throw fetchError;
  if (!queueItems || queueItems.length === 0) {
    return new Response(
      JSON.stringify({ message: 'No items to process', processed: 0 }),
      { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Lock the batch
  const ids = (queueItems as QueueItem[]).map(i => i.id);
  await supabase
    .from('intelligence_queue')
    .update({ locked_by: lockId, locked_at: new Date().toISOString(), status: 'processing' })
    .in('id', ids);

  console.log(`${LOG_PREFIX} Locked ${queueItems.length} items`);

  let successCount = 0;
  let failCount = 0;

  for (const item of queueItems as QueueItem[]) {
    try {
      let result: ProcessResult;

      switch (item.processing_type) {
        case 'generate_embedding': {
          if (item.entity_type === 'communication') {
            result = await generateCommunicationEmbedding(supabase, item);
          } else {
            result = await invokeEmbeddingFunction(supabase, item);
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
            body: { interaction_id: item.entity_id }
          });
          result = invokeResult.error
            ? { success: false, error: { message: invokeResult.error.message } }
            : { success: true };
          break;
        }
        case 'update_training_label': {
          const invokeResult = await supabase.functions.invoke('track-ml-outcome', {
            body: { application_id: item.entity_id }
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

      // Mark completed, unlock
      await supabase
        .from('intelligence_queue')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
          locked_by: null,
          locked_at: null,
        })
        .eq('id', item.id);

      successCount++;
      console.log(`${LOG_PREFIX} ✓ ${item.processing_type} for ${item.entity_type}:${item.entity_id}`);

    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`${LOG_PREFIX} ✗ ${item.processing_type}: ${errMsg}`);

      const newAttempts = (item.attempts || 0) + 1;

      if (newAttempts >= 3) {
        // Send to DLQ
        await supabase.from('dead_letter_queue').insert({
          source_table: 'intelligence_queue',
          source_id: item.id,
          original_payload: item as unknown as Record<string, unknown>,
          error_message: errMsg,
        });

        await supabase
          .from('intelligence_queue')
          .update({
            status: 'failed',
            last_error: errMsg,
            attempts: newAttempts,
            locked_by: null,
            locked_at: null,
          })
          .eq('id', item.id);
      } else {
        // Retry later
        await supabase
          .from('intelligence_queue')
          .update({
            status: 'pending',
            last_error: errMsg,
            attempts: newAttempts,
            locked_by: null,
            locked_at: null,
          })
          .eq('id', item.id);
      }

      failCount++;
    }
  }

  return new Response(
    JSON.stringify({ processed: queueItems.length, success: successCount, failed: failCount }),
    { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
  );
}));

// ---------------------------------------------------------------------------
// Processors
// ---------------------------------------------------------------------------

async function invokeEmbeddingFunction(supabase: SupabaseClient, item: QueueItem): Promise<ProcessResult> {
  const entityType = item.entity_type === 'candidate_profiles' ? 'candidate' : 'job';
  const invokeResult = await supabase.functions.invoke('generate-embeddings', {
    body: { entity_type: entityType, entity_id: item.entity_id }
  });
  return invokeResult.error
    ? { success: false, error: { message: invokeResult.error.message } }
    : { success: true };
}

async function generateCommunicationEmbedding(supabase: SupabaseClient, item: QueueItem): Promise<ProcessResult> {
  const { data: comm, error } = await supabase
    .from('unified_communications')
    .select('*')
    .eq('id', item.entity_id)
    .single();

  if (error || !comm) {
    return { success: false, error: { message: `Communication not found: ${item.entity_id}` } };
  }

  const textParts: string[] = [];
  if (comm.subject) textParts.push(`Subject: ${comm.subject}`);
  textParts.push(`Channel: ${comm.channel}`);
  textParts.push(`Direction: ${comm.direction}`);
  textParts.push(`Type: ${comm.entity_type}`);
  if (comm.content_preview) textParts.push(`Content: ${comm.content_preview}`);
  const textForEmbedding = textParts.join('\n');

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const embeddingResponse = await fetch(
    `${supabaseUrl}/functions/v1/generate-embeddings`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        text: textForEmbedding,
        entity_type: 'communication',
        entity_id: item.entity_id,
      }),
    }
  );

  if (!embeddingResponse.ok) {
    // Store without vector for later processing
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
        pending_embedding: true,
      },
    }, { onConflict: 'entity_type,entity_id' });

    return { success: true };
  }

  const embeddingData = await embeddingResponse.json();

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
    },
  }, { onConflict: 'entity_type,entity_id' });

  return { success: true };
}

async function extractCommunicationFacts(supabase: SupabaseClient, item: QueueItem): Promise<ProcessResult> {
  const { data: comm, error } = await supabase
    .from('unified_communications')
    .select('*')
    .eq('id', item.entity_id)
    .single();

  if (error || !comm) {
    return { success: false, error: { message: `Communication not found: ${item.entity_id}` } };
  }

  if (!comm.content_preview || comm.content_preview.length < 50) {
    return { success: true };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const aiResponse = await fetch(
    `${supabaseUrl}/functions/v1/club-ai-chat`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        message: `Extract key facts from this ${comm.channel} communication. Return ONLY a JSON array of objects with: fact (string), category (one of: preference, commitment, deadline, budget, relationship), confidence (number 0-1). No other text.\n\nContent: ${comm.content_preview}`,
        context: { extractionMode: true, systemOnly: true },
      }),
    }
  );

  if (!aiResponse.ok) {
    return { success: true }; // Non-critical
  }

  const aiData = await aiResponse.json();

  try {
    const factsMatch = aiData.response?.match(/\[[\s\S]*?\]/);
    if (factsMatch && comm.entity_id) {
      const facts = JSON.parse(factsMatch[0]);
      for (const fact of facts) {
        if (fact.confidence >= 0.6) {
          await supabase.from('ai_memory').insert({
            user_id: comm.entity_id,
            memory_type: fact.category || 'general',
            content: fact.fact,
            context: {
              source: 'communication',
              channel: comm.channel,
              communication_id: comm.id,
              extracted_at: new Date().toISOString(),
            },
            relevance_score: fact.confidence,
          });
        }
      }
    }
  } catch {
    // Parse failure is non-critical
  }

  return { success: true };
}

async function analyzeCommunicationSentiment(supabase: SupabaseClient, item: QueueItem): Promise<ProcessResult> {
  const { data: comm, error } = await supabase
    .from('unified_communications')
    .select('*')
    .eq('id', item.entity_id)
    .single();

  if (error || !comm) {
    return { success: false, error: { message: `Communication not found: ${item.entity_id}` } };
  }

  if (comm.sentiment_score !== null || !comm.content_preview || comm.content_preview.length < 20) {
    return { success: true };
  }

  const content = comm.content_preview.toLowerCase();

  const positiveWords = ['thank', 'great', 'excellent', 'happy', 'pleased', 'excited', 'love', 'wonderful', 'perfect', 'amazing', 'fantastic', 'appreciate', 'helpful', 'brilliant'];
  const negativeWords = ['sorry', 'unfortunately', 'problem', 'issue', 'disappointed', 'frustrated', 'concerned', 'worried', 'difficult', 'wrong', 'bad', 'terrible', 'awful', 'complaint'];

  let score = 0;
  positiveWords.forEach(w => { if (content.includes(w)) score += 0.1; });
  negativeWords.forEach(w => { if (content.includes(w)) score -= 0.1; });

  const sentimentScore = Math.max(-1, Math.min(1, score));

  await supabase
    .from('unified_communications')
    .update({ sentiment_score: sentimentScore })
    .eq('id', item.entity_id);

  return { success: true };
}
