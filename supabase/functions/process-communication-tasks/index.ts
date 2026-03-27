import { createHandler } from '../_shared/handler.ts';
import type { SupabaseClient } from '../_shared/handler.ts';

interface CommTaskQueueItem {
  id: string;
  source_table: string;
  source_id: string;
  processing_status: string;
  priority: number;
  error_message: string | null;
  result: unknown;
  locked_by: string | null;
  locked_at: string | null;
}

const LOG_PREFIX = '[process-communication-tasks]';

Deno.serve(createHandler(async (req, ctx) => {
  const supabase = ctx.supabase;
  const { batch_size = 20 } = await req.json().catch(() => ({}));
  const lockId = `pct_${crypto.randomUUID().slice(0, 8)}`;

  console.log(`${LOG_PREFIX} Processing batch (size: ${batch_size}, lock: ${lockId})`);

  // Fetch pending items
  const { data: items, error: fetchError } = await supabase
    .from('communication_task_queue')
    .select('*')
    .eq('processing_status', 'pending')
    .is('locked_by', null)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(batch_size);

  if (fetchError) throw fetchError;
  if (!items || items.length === 0) {
    return new Response(
      JSON.stringify({ message: 'No items to process', processed: 0 }),
      { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Lock the batch
  const ids = (items as CommTaskQueueItem[]).map(i => i.id);
  await supabase
    .from('communication_task_queue')
    .update({ locked_by: lockId, locked_at: new Date().toISOString(), processing_status: 'processing' })
    .in('id', ids);

  console.log(`${LOG_PREFIX} Locked ${items.length} items`);

  let successCount = 0;
  let failCount = 0;

  for (const item of items as CommTaskQueueItem[]) {
    try {
      // Load the source communication record
      const { data: sourceRecord, error: sourceError } = await supabase
        .from(item.source_table)
        .select('*')
        .eq('id', item.source_id)
        .single();

      if (sourceError || !sourceRecord) {
        throw new Error(`Source record not found: ${item.source_table}:${item.source_id}`);
      }

      // Extract action items using AI
      const actionItems = await extractActionItems(supabase, sourceRecord, item.source_table);

      // Create unified_tasks for extracted items
      const tasksCreated: string[] = [];

      for (const actionItem of actionItems) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (actionItem.due_days || 3));

        const { data: task, error: taskError } = await supabase
          .from('unified_tasks')
          .insert({
            title: actionItem.title,
            description: actionItem.description,
            priority: actionItem.priority || 'medium',
            status: 'pending',
            due_date: dueDate.toISOString(),
            user_id: sourceRecord.user_id || sourceRecord.assigned_strategist || null,
            source: 'communication_task_queue',
            metadata: {
              source_table: item.source_table,
              source_id: item.source_id,
              auto_generated: true,
              extraction_confidence: actionItem.confidence,
            },
          })
          .select('id')
          .single();

        if (!taskError && task) {
          tasksCreated.push(task.id);
        }
      }

      // Mark completed
      await supabase
        .from('communication_task_queue')
        .update({
          processing_status: 'completed',
          result: { tasks_created: tasksCreated.length, task_ids: tasksCreated },
          processed_at: new Date().toISOString(),
          locked_by: null,
          locked_at: null,
        })
        .eq('id', item.id);

      successCount++;
      console.log(`${LOG_PREFIX} ✓ ${item.source_table}:${item.source_id} -> ${tasksCreated.length} tasks`);

    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`${LOG_PREFIX} ✗ ${item.source_table}:${item.source_id}: ${errMsg}`);

      // Send to DLQ
      await supabase.from('dead_letter_queue').insert({
        source_table: 'communication_task_queue',
        source_id: item.id,
        original_payload: item as unknown as Record<string, unknown>,
        error_message: errMsg,
      });

      await supabase
        .from('communication_task_queue')
        .update({
          processing_status: 'failed',
          error_message: errMsg,
          processed_at: new Date().toISOString(),
          locked_by: null,
          locked_at: null,
        })
        .eq('id', item.id);

      failCount++;
    }
  }

  return new Response(
    JSON.stringify({ processed: items.length, success: successCount, failed: failCount }),
    { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
  );
}));

// ---------------------------------------------------------------------------
// AI-powered action item extraction
// ---------------------------------------------------------------------------

interface ActionItem {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_days: number;
  confidence: number;
}

async function extractActionItems(
  supabase: SupabaseClient,
  record: Record<string, unknown>,
  sourceTable: string,
): Promise<ActionItem[]> {
  // Build context from the source record
  const contentParts: string[] = [];

  if (record.subject) contentParts.push(`Subject: ${record.subject}`);
  if (record.content_preview) contentParts.push(`Content: ${record.content_preview}`);
  if (record.body) contentParts.push(`Body: ${String(record.body).slice(0, 1000)}`);
  if (record.notes) contentParts.push(`Notes: ${record.notes}`);
  if (record.channel) contentParts.push(`Channel: ${record.channel}`);

  const content = contentParts.join('\n');

  if (content.length < 30) {
    return []; // Too little content to extract from
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    const aiResponse = await fetch(
      `${supabaseUrl}/functions/v1/club-ai-chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          message: `Analyze this ${sourceTable} record and extract actionable tasks. Return ONLY a JSON array of objects with: title (string, max 80 chars), description (string), priority (low|medium|high|urgent), due_days (number 0-7), confidence (number 0-1). If no clear actions, return an empty array []. No other text.

${content}`,
          context: { extractionMode: true, systemOnly: true },
        }),
      }
    );

    if (!aiResponse.ok) {
      // Fall back to rule-based extraction
      return ruleBasedExtraction(record, sourceTable);
    }

    const aiData = await aiResponse.json();
    const match = aiData.response?.match(/\[[\s\S]*?\]/);

    if (match) {
      const parsed = JSON.parse(match[0]);
      return parsed.filter((item: ActionItem) => item.confidence >= 0.5);
    }
  } catch {
    // Fall back to rule-based
  }

  return ruleBasedExtraction(record, sourceTable);
}

function ruleBasedExtraction(record: Record<string, unknown>, sourceTable: string): ActionItem[] {
  const items: ActionItem[] = [];
  const content = String(record.content_preview || record.body || record.notes || '').toLowerCase();

  // Detect follow-up needs
  if (content.includes('follow up') || content.includes('follow-up') || content.includes('get back to')) {
    items.push({
      title: `Follow up: ${String(record.subject || sourceTable).slice(0, 60)}`,
      description: `Follow-up action detected in ${sourceTable} communication`,
      priority: 'medium',
      due_days: 2,
      confidence: 0.7,
    });
  }

  // Detect scheduling needs
  if (content.includes('schedule') || content.includes('meeting') || content.includes('call')) {
    items.push({
      title: `Schedule: ${String(record.subject || 'meeting/call').slice(0, 60)}`,
      description: `Scheduling action detected in ${sourceTable} communication`,
      priority: 'high',
      due_days: 1,
      confidence: 0.6,
    });
  }

  // Detect deadline mentions
  if (content.includes('deadline') || content.includes('by tomorrow') || content.includes('urgent') || content.includes('asap')) {
    items.push({
      title: `Urgent: ${String(record.subject || sourceTable).slice(0, 60)}`,
      description: `Urgent/deadline action detected in ${sourceTable} communication`,
      priority: 'urgent',
      due_days: 0,
      confidence: 0.65,
    });
  }

  return items;
}
