import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppMessage {
  timestamp: Date;
  sender: string;
  content: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { file_url, company_id, import_id } = await req.json();

    if (!file_url || !company_id || !import_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[WhatsApp Parser] Starting parse for import:', import_id);

    // Update import status
    await supabaseClient
      .from('whatsapp_imports')
      .update({ status: 'parsing' })
      .eq('id', import_id);

    // Download the file
    const fileResponse = await fetch(file_url);
    const fileContent = await fileResponse.text();

    // Parse WhatsApp format
    // Format: [12/11/2024, 10:23:45] John Smith: Hey, still looking for that senior dev?
    const messages: WhatsAppMessage[] = [];
    const participants = new Set<string>();
    
    const lines = fileContent.split('\n');
    let currentMessage: WhatsAppMessage | null = null;

    for (const line of lines) {
      // Match WhatsApp message format with various date formats
      const match = line.match(/^\[?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?)\]?\s*[-:]?\s*([^:]+):\s*(.+)$/i);
      
      if (match) {
        // Save previous message
        if (currentMessage) {
          messages.push(currentMessage);
        }

        const [, dateStr, timeStr, sender, content] = match;
        
        // Parse date (handle both DD/MM/YYYY and MM/DD/YYYY)
        const dateParts = dateStr.split(/[\/\-]/);
        let year = parseInt(dateParts[2]);
        if (year < 100) year += 2000; // Handle 2-digit years
        
        // Try MM/DD/YYYY format first (US)
        let timestamp = new Date(year, parseInt(dateParts[0]) - 1, parseInt(dateParts[1]));
        
        // If invalid, try DD/MM/YYYY format (EU)
        if (isNaN(timestamp.getTime())) {
          timestamp = new Date(year, parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
        }

        // Parse time
        const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s?([AP]M))?/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const seconds = timeMatch[3] ? parseInt(timeMatch[3]) : 0;
          const ampm = timeMatch[4]?.toUpperCase();

          if (ampm === 'PM' && hours < 12) hours += 12;
          if (ampm === 'AM' && hours === 12) hours = 0;

          timestamp.setHours(hours, minutes, seconds);
        }

        const cleanSender = sender.trim().replace(/^~/, ''); // Remove ~ prefix
        participants.add(cleanSender);
        
        currentMessage = {
          timestamp,
          sender: cleanSender,
          content: content.trim(),
        };
      } else if (currentMessage && line.trim()) {
        // Continuation of previous message
        currentMessage.content += '\n' + line.trim();
      }
    }

    // Don't forget the last message
    if (currentMessage) {
      messages.push(currentMessage);
    }

    console.log(`[WhatsApp Parser] Parsed ${messages.length} messages from ${participants.size} participants`);

    if (messages.length === 0) {
      throw new Error('No messages found in file. Please check the format.');
    }

    // Get date range
    const timestamps = messages.map(m => m.timestamp.getTime());
    const dateRangeStart = new Date(Math.min(...timestamps));
    const dateRangeEnd = new Date(Math.max(...timestamps));

    // Create interaction record
    const { data: interaction, error: interactionError } = await supabaseClient
      .from('company_interactions')
      .insert({
        company_id,
        interaction_type: 'whatsapp',
        interaction_date: dateRangeStart.toISOString(),
        duration_minutes: Math.round((dateRangeEnd.getTime() - dateRangeStart.getTime()) / 60000),
        direction: 'mutual',
        our_participant_id: user.id,
        subject: `WhatsApp conversation (${messages.length} messages)`,
        summary: `Imported WhatsApp chat with ${participants.size} participants`,
        is_manually_entered: false,
        status: 'active',
        source_metadata: {
          import_id,
          participant_count: participants.size,
          message_count: messages.length,
        },
      })
      .select()
      .single();

    if (interactionError) throw interactionError;

    // Store individual messages
    const messageRecords = messages.map((msg, index) => ({
      interaction_id: interaction.id,
      sender_name: msg.sender,
      message_content: msg.content,
      message_timestamp: msg.timestamp.toISOString(),
      message_index: index,
    }));

    // Insert in batches of 100
    for (let i = 0; i < messageRecords.length; i += 100) {
      const batch = messageRecords.slice(i, i + 100);
      await supabaseClient
        .from('interaction_messages')
        .insert(batch);
    }

    // Update import with results
    await supabaseClient
      .from('whatsapp_imports')
      .update({
        status: 'completed',
        total_messages: messages.length,
        date_range_start: dateRangeStart.toISOString().split('T')[0],
        date_range_end: dateRangeEnd.toISOString().split('T')[0],
        participants_detected: Array.from(participants),
        completed_at: new Date().toISOString(),
      })
      .eq('id', import_id);

    console.log('[WhatsApp Parser] Parse complete, triggering entity resolution');

    // Trigger entity resolution
    await supabaseClient.functions.invoke('resolve-stakeholder-entities', {
      body: {
        import_id,
        company_id,
        interaction_id: interaction.id,
        participant_names: Array.from(participants),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        interaction_id: interaction.id,
        total_messages: messages.length,
        participants_detected: Array.from(participants),
        date_range: {
          start: dateRangeStart.toISOString(),
          end: dateRangeEnd.toISOString(),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[WhatsApp Parser] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
