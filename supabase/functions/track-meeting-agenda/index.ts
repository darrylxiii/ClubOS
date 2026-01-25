import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AgendaItem {
  id: string;
  title: string;
  allocated_minutes: number;
  status: 'pending' | 'active' | 'completed' | 'skipped';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, meetingId, agendaItems, currentTranscript, itemId } = await req.json();

    if (!meetingId) {
      return new Response(
        JSON.stringify({ error: 'Meeting ID required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    switch (action) {
      case 'create':
        return await createAgenda(supabase, meetingId, agendaItems);
      case 'start_item':
        return await startAgendaItem(supabase, meetingId, itemId);
      case 'complete_item':
        return await completeAgendaItem(supabase, meetingId, itemId);
      case 'skip_item':
        return await skipAgendaItem(supabase, meetingId, itemId);
      case 'detect_topic':
        return await detectTopicChange(supabase, meetingId, currentTranscript);
      case 'get_status':
        return await getAgendaStatus(supabase, meetingId);
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
  } catch (error) {
    console.error('[track-meeting-agenda] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function createAgenda(supabase: any, meetingId: string, items: Array<{ title: string; minutes: number; description?: string }>) {
  // Delete existing agenda items
  await supabase
    .from('meeting_agenda_items')
    .delete()
    .eq('meeting_id', meetingId);

  // Create new agenda items
  const agendaItems = items.map((item, index) => ({
    meeting_id: meetingId,
    item_order: index + 1,
    title: item.title,
    description: item.description || null,
    allocated_minutes: item.minutes,
    status: 'pending'
  }));

  const { data, error } = await supabase
    .from('meeting_agenda_items')
    .insert(agendaItems)
    .select();

  if (error) {
    throw new Error(`Failed to create agenda: ${error.message}`);
  }

  return new Response(
    JSON.stringify({ success: true, agenda: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function startAgendaItem(supabase: any, meetingId: string, itemId: string) {
  // Mark any currently active item as completed
  await supabase
    .from('meeting_agenda_items')
    .update({ 
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('meeting_id', meetingId)
    .eq('status', 'active');

  // Start the new item
  const { data, error } = await supabase
    .from('meeting_agenda_items')
    .update({ 
      status: 'active',
      started_at: new Date().toISOString()
    })
    .eq('id', itemId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to start agenda item: ${error.message}`);
  }

  return new Response(
    JSON.stringify({ success: true, item: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function completeAgendaItem(supabase: any, meetingId: string, itemId: string) {
  // Get the item to calculate actual duration
  const { data: item } = await supabase
    .from('meeting_agenda_items')
    .select('started_at')
    .eq('id', itemId)
    .single();

  let actualMinutes = null;
  if (item?.started_at) {
    const startTime = new Date(item.started_at);
    const endTime = new Date();
    actualMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
  }

  const { data, error } = await supabase
    .from('meeting_agenda_items')
    .update({ 
      status: 'completed',
      completed_at: new Date().toISOString(),
      actual_minutes: actualMinutes
    })
    .eq('id', itemId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to complete agenda item: ${error.message}`);
  }

  // Auto-start next pending item
  const { data: nextItem } = await supabase
    .from('meeting_agenda_items')
    .select('id')
    .eq('meeting_id', meetingId)
    .eq('status', 'pending')
    .order('item_order', { ascending: true })
    .limit(1)
    .single();

  let startedNext = false;
  if (nextItem) {
    await supabase
      .from('meeting_agenda_items')
      .update({ 
        status: 'active',
        started_at: new Date().toISOString()
      })
      .eq('id', nextItem.id);
    startedNext = true;
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      item: data,
      startedNextItem: startedNext,
      overTime: actualMinutes && item?.allocated_minutes 
        ? actualMinutes > item.allocated_minutes 
        : false
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function skipAgendaItem(supabase: any, meetingId: string, itemId: string) {
  const { data, error } = await supabase
    .from('meeting_agenda_items')
    .update({ status: 'skipped' })
    .eq('id', itemId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to skip agenda item: ${error.message}`);
  }

  return new Response(
    JSON.stringify({ success: true, item: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function detectTopicChange(supabase: any, meetingId: string, transcript: string) {
  // Get current agenda
  const { data: agenda } = await supabase
    .from('meeting_agenda_items')
    .select('*')
    .eq('meeting_id', meetingId)
    .order('item_order', { ascending: true });

  if (!agenda || agenda.length === 0) {
    return new Response(
      JSON.stringify({ detected: false, message: 'No agenda found' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const activeItem = agenda.find((item: any) => item.status === 'active');
  const pendingItems = agenda.filter((item: any) => item.status === 'pending');

  if (!activeItem || pendingItems.length === 0) {
    return new Response(
      JSON.stringify({ detected: false, message: 'No transition possible' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Use AI to detect if transcript suggests topic change
  const prompt = `Given the current meeting agenda topic "${activeItem.title}" and the recent transcript:

"${transcript.slice(-500)}"

Does the conversation suggest we've moved on to a new topic? The next agenda items are:
${pendingItems.map((item: any) => `- ${item.title}`).join('\n')}

Respond with JSON:
{
  "topicChanged": true/false,
  "suggestedNextItem": "item title if detected",
  "confidence": 0-100,
  "reason": "brief explanation"
}`;

  try {
    const response = await fetch('https://dpjucecmoyfzrduhlctt.functions.supabase.co/lovable-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a meeting assistant that detects topic transitions.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error('AI request failed');
    }

    const aiResult = await response.json();
    const parsed = JSON.parse(aiResult.choices?.[0]?.message?.content || '{}');

    if (parsed.topicChanged && parsed.confidence > 70) {
      // Find the matching next item
      const matchingItem = pendingItems.find((item: any) => 
        item.title.toLowerCase().includes(parsed.suggestedNextItem?.toLowerCase() || '')
      );

      return new Response(
        JSON.stringify({
          detected: true,
          suggestion: {
            currentItem: activeItem,
            suggestedNextItem: matchingItem || pendingItems[0],
            confidence: parsed.confidence,
            reason: parsed.reason
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ detected: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[track-meeting-agenda] AI detection failed:', error);
    return new Response(
      JSON.stringify({ detected: false, error: 'Detection failed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function getAgendaStatus(supabase: any, meetingId: string) {
  const { data: agenda, error } = await supabase
    .from('meeting_agenda_items')
    .select('*')
    .eq('meeting_id', meetingId)
    .order('item_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to get agenda: ${error.message}`);
  }

  const activeItem = agenda?.find((item: any) => item.status === 'active');
  let timeRemaining = null;
  let isOverTime = false;

  if (activeItem?.started_at && activeItem?.allocated_minutes) {
    const startTime = new Date(activeItem.started_at);
    const elapsed = (Date.now() - startTime.getTime()) / 60000;
    timeRemaining = Math.round(activeItem.allocated_minutes - elapsed);
    isOverTime = timeRemaining < 0;
  }

  const totalAllocated = agenda?.reduce((sum: number, item: any) => sum + (item.allocated_minutes || 0), 0) || 0;
  const completedMinutes = agenda
    ?.filter((item: any) => item.status === 'completed')
    .reduce((sum: number, item: any) => sum + (item.actual_minutes || item.allocated_minutes || 0), 0) || 0;

  return new Response(
    JSON.stringify({
      success: true,
      agenda,
      activeItem,
      timeRemaining,
      isOverTime,
      progress: {
        completed: agenda?.filter((item: any) => item.status === 'completed').length || 0,
        total: agenda?.length || 0,
        completedMinutes,
        totalAllocated
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
