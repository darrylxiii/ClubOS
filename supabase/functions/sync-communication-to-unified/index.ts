import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  source_table: 'whatsapp_messages' | 'crm_email_replies' | 'meetings' | 'company_interactions';
  source_id: string;
  entity_type?: string;
  entity_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { source_table, source_id, entity_type, entity_id } = await req.json() as SyncRequest;

    console.log(`[sync-communication] Syncing ${source_table}:${source_id}`);

    let unifiedRecord: any = null;

    // Fetch source record and transform based on table type
    if (source_table === 'whatsapp_messages') {
      const { data: message, error } = await supabase
        .from('whatsapp_messages')
        .select(`
          *,
          conversation:whatsapp_conversations(
            candidate_id,
            prospect_id,
            contact_phone
          )
        `)
        .eq('id', source_id)
        .single();

      if (error || !message) {
        throw new Error(`WhatsApp message not found: ${error?.message}`);
      }

      // Determine entity
      const conv = message.conversation;
      const resolvedEntityType = entity_type || (conv?.candidate_id ? 'candidate' : conv?.prospect_id ? 'prospect' : 'stakeholder');
      const resolvedEntityId = entity_id || conv?.candidate_id || conv?.prospect_id;

      unifiedRecord = {
        entity_type: resolvedEntityType,
        entity_id: resolvedEntityId,
        channel: 'whatsapp',
        source_table: 'whatsapp_messages',
        source_id: message.id,
        direction: message.direction === 'inbound' ? 'inbound' : 'outbound',
        content_preview: message.content?.substring(0, 500),
        sentiment_score: message.sentiment_score,
        intent: message.intent_classification,
        original_timestamp: message.created_at,
        has_attachment: !!message.media_url,
      };
    } else if (source_table === 'crm_email_replies') {
      const { data: reply, error } = await supabase
        .from('crm_email_replies')
        .select('*, prospect:crm_prospects(*)')
        .eq('id', source_id)
        .single();

      if (error || !reply) {
        throw new Error(`Email reply not found: ${error?.message}`);
      }

      unifiedRecord = {
        entity_type: entity_type || 'prospect',
        entity_id: entity_id || reply.prospect_id,
        channel: 'email',
        source_table: 'crm_email_replies',
        source_id: reply.id,
        direction: 'inbound',
        subject: reply.subject,
        content_preview: reply.body_preview?.substring(0, 500),
        sentiment_score: reply.sentiment_score,
        intent: reply.intent,
        intent_confidence: reply.intent_confidence,
        original_timestamp: reply.received_at,
        has_attachment: reply.has_attachments,
      };
    } else if (source_table === 'meetings') {
      const { data: meeting, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', source_id)
        .single();

      if (error || !meeting) {
        throw new Error(`Meeting not found: ${error?.message}`);
      }

      // Try to determine entity from meeting metadata or attendees
      const resolvedEntityType = entity_type || 'candidate';
      const resolvedEntityId = entity_id || meeting.candidate_id;

      unifiedRecord = {
        entity_type: resolvedEntityType,
        entity_id: resolvedEntityId,
        channel: 'meeting',
        source_table: 'meetings',
        source_id: meeting.id,
        direction: 'mutual',
        subject: meeting.title,
        content_preview: meeting.description?.substring(0, 500),
        original_timestamp: meeting.scheduled_start,
      };
    } else if (source_table === 'company_interactions') {
      const { data: interaction, error } = await supabase
        .from('company_interactions')
        .select('*')
        .eq('id', source_id)
        .single();

      if (error || !interaction) {
        throw new Error(`Interaction not found: ${error?.message}`);
      }

      // Map interaction_type to channel
      const channelMap: Record<string, string> = {
        'whatsapp': 'whatsapp',
        'email': 'email',
        'phone_call': 'phone',
        'zoom_meeting': 'meeting',
        'linkedin_message': 'linkedin',
        'in_person': 'in_person',
        'other': 'other',
      };

      unifiedRecord = {
        entity_type: entity_type || 'company',
        entity_id: entity_id || interaction.company_id,
        channel: channelMap[interaction.interaction_type] || 'other',
        source_table: 'company_interactions',
        source_id: interaction.id,
        direction: interaction.direction,
        subject: interaction.subject,
        content_preview: interaction.summary?.substring(0, 500),
        sentiment_score: interaction.sentiment_score,
        key_topics: interaction.key_topics,
        original_timestamp: interaction.interaction_date,
        has_attachment: (interaction.attachment_urls?.length || 0) > 0,
      };
    }

    if (!unifiedRecord || !unifiedRecord.entity_id) {
      throw new Error('Could not determine entity for communication');
    }

    // Insert into unified_communications
    const { data: inserted, error: insertError } = await supabase
      .from('unified_communications')
      .upsert(unifiedRecord, {
        onConflict: 'source_table,source_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[sync-communication] Insert error:', insertError);
      throw insertError;
    }

    console.log(`[sync-communication] Successfully synced communication ${inserted.id}`);

    // Queue for pattern analysis
    await supabase.from('communication_intelligence_queue').insert({
      entity_type: unifiedRecord.entity_type,
      entity_id: unifiedRecord.entity_id,
      processing_type: 'pattern_analysis',
      source_communication_id: inserted.id,
      priority: 5,
    });

    return new Response(
      JSON.stringify({ success: true, communication_id: inserted.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[sync-communication] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
