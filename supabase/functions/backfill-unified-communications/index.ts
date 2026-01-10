import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BackfillProgress {
  table: string;
  total: number;
  processed: number;
  errors: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { table, batchSize = 100, offset = 0 } = await req.json().catch(() => ({}));

    const progress: BackfillProgress[] = [];

    // Define sources to backfill
    const sources = table 
      ? [{ name: table, batchSize, offset }]
      : [
          { name: 'emails', batchSize: 100, offset: 0 },
          { name: 'meetings', batchSize: 50, offset: 0 },
          { name: 'messages', batchSize: 100, offset: 0 },
          { name: 'dm_messages', batchSize: 100, offset: 0 },
          { name: 'whatsapp_messages', batchSize: 100, offset: 0 },
          { name: 'sms_messages', batchSize: 100, offset: 0 },
        ];

    for (const source of sources) {
      const result = await backfillTable(supabase, source.name, source.batchSize, source.offset);
      progress.push(result);
    }

    const totalProcessed = progress.reduce((sum, p) => sum + p.processed, 0);
    const totalErrors = progress.reduce((sum, p) => sum + p.errors, 0);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Backfill complete: ${totalProcessed} records processed, ${totalErrors} errors`,
        progress,
        timestamp: new Date().toISOString(),
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Backfill error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});

async function backfillTable(
  supabase: any, 
  tableName: string, 
  batchSize: number,
  offset: number
): Promise<BackfillProgress> {
  let processed = 0;
  let errors = 0;
  let total = 0;

  try {
    // Get total count
    const { count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    total = count || 0;

    if (total === 0) {
      return { table: tableName, total: 0, processed: 0, errors: 0 };
    }

    // Check which records already exist in unified_communications
    const { data: existingIds } = await supabase
      .from('unified_communications')
      .select('source_id')
      .eq('source_table', tableName);

    const existingIdSet = new Set((existingIds || []).map((r: any) => r.source_id));

    // Fetch records in batches
    let currentOffset = offset;
    let hasMore = true;

    while (hasMore) {
      const { data: records, error: fetchError } = await supabase
        .from(tableName)
        .select('*')
        .range(currentOffset, currentOffset + batchSize - 1)
        .order('created_at', { ascending: true });

      if (fetchError) {
        console.error(`Error fetching ${tableName}:`, fetchError);
        errors++;
        break;
      }

      if (!records || records.length === 0) {
        hasMore = false;
        break;
      }

      // Filter out already processed records
      const newRecords = records.filter((r: any) => !existingIdSet.has(r.id));

      // Transform and insert each record
      for (const record of newRecords) {
        try {
          const unified = transformToUnified(tableName, record);
          
          if (unified && unified.entity_id) {
            // Insert into unified_communications
            const { data: insertedUnified, error: insertError } = await supabase
              .from('unified_communications')
              .upsert({
                ...unified,
                source_table: tableName,
                source_id: record.id,
              }, {
                onConflict: 'source_table,source_id'
              })
              .select('id')
              .single();

            if (insertError) {
              console.error(`Error inserting unified record for ${tableName}:`, insertError);
              errors++;
            } else if (insertedUnified) {
              // Queue for embedding generation
              await supabase
                .from('intelligence_queue')
                .insert({
                  entity_type: 'communication',
                  entity_id: insertedUnified.id,
                  processing_type: 'generate_embedding',
                  priority: getPriority(tableName),
                  metadata: {
                    channel: unified.channel,
                    entity_type: unified.entity_type,
                    source_table: tableName,
                    source_id: record.id,
                    backfilled: true
                  }
                });
              
              processed++;
            }
          }
        } catch (err) {
          console.error(`Error processing record ${record.id} from ${tableName}:`, err);
          errors++;
        }
      }

      currentOffset += batchSize;
      hasMore = records.length === batchSize;

      // Rate limiting - small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

  } catch (error) {
    console.error(`Backfill error for ${tableName}:`, error);
    errors++;
  }

  return { table: tableName, total, processed, errors };
}

function transformToUnified(tableName: string, record: any): any {
  switch (tableName) {
    case 'emails':
      return {
        entity_type: 'candidate',
        entity_id: record.user_id,
        channel: 'email',
        direction: record.inbox_type === 'sent' ? 'outbound' : 'inbound',
        subject: record.subject,
        content_preview: record.snippet?.substring(0, 500),
        original_timestamp: record.email_date || record.created_at,
        sender_id: record.user_id,
      };

    case 'meetings':
      return {
        entity_type: record.candidate_id ? 'candidate' : (record.prospect_id ? 'prospect' : 'internal'),
        entity_id: record.candidate_id || record.prospect_id || record.user_id,
        channel: 'meeting',
        direction: 'mutual',
        subject: record.title,
        content_preview: (record.description || record.notes)?.substring(0, 500),
        original_timestamp: record.start_time || record.created_at,
        sender_id: record.user_id,
      };

    case 'messages':
      return {
        entity_type: 'internal',
        entity_id: record.conversation_id,
        channel: 'chat',
        direction: 'mutual',
        content_preview: record.content?.substring(0, 500),
        original_timestamp: record.created_at,
        sender_id: record.sender_id,
      };

    case 'dm_messages':
      return {
        entity_type: 'internal',
        entity_id: record.conversation_id,
        channel: 'dm',
        direction: 'mutual',
        content_preview: record.content?.substring(0, 500),
        original_timestamp: record.created_at,
        sender_id: record.sender_id,
      };

    case 'whatsapp_messages':
      return {
        entity_type: 'candidate', // Will be updated by trigger with proper lookup
        entity_id: record.sender_id || record.conversation_id,
        channel: 'whatsapp',
        direction: record.direction || 'inbound',
        content_preview: record.content?.substring(0, 500),
        sentiment_score: record.sentiment_score,
        original_timestamp: record.created_at,
        sender_id: record.sender_id,
      };

    case 'sms_messages':
      return {
        entity_type: record.candidate_id ? 'candidate' : (record.prospect_id ? 'prospect' : 'stakeholder'),
        entity_id: record.candidate_id || record.prospect_id,
        channel: 'sms',
        direction: record.direction || 'outbound',
        content_preview: record.content?.substring(0, 500),
        sentiment_score: record.sentiment_score,
        original_timestamp: record.sent_at || record.created_at,
        sender_id: record.sender_id,
      };

    default:
      return null;
  }
}

function getPriority(tableName: string): number {
  switch (tableName) {
    case 'whatsapp_messages': return 9;
    case 'emails': return 8;
    case 'sms_messages': return 8;
    case 'meetings': return 7;
    default: return 5;
  }
}
