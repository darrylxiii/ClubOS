import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ActionItem {
  task: string;
  owner?: string;
  deadline?: string;
  priority?: 'high' | 'medium' | 'low';
  timestamp_ms?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { meeting_id, recording_id, action_items } = await req.json();

    if (!meeting_id && !recording_id) {
      return new Response(JSON.stringify({ error: 'meeting_id or recording_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let actionItemsToProcess: ActionItem[] = action_items || [];

    // If no action items provided, fetch from recording analysis
    if (actionItemsToProcess.length === 0 && recording_id) {
      const { data: recording, error: recordingError } = await supabase
        .from('meeting_recordings_extended')
        .select('ai_summary, meeting_id')
        .eq('id', recording_id)
        .single();

      if (recordingError) {
        console.error('Error fetching recording:', recordingError);
        return new Response(JSON.stringify({ error: 'Recording not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const aiSummary = recording.ai_summary || {};
      actionItemsToProcess = aiSummary.actionItems || [];
    }

    // Fetch meeting details for context
    const targetMeetingId = meeting_id || (await supabase
      .from('meeting_recordings_extended')
      .select('meeting_id')
      .eq('id', recording_id)
      .single()
    ).data?.meeting_id;

    const { data: meeting } = await supabase
      .from('meetings')
      .select('title, scheduled_start')
      .eq('id', targetMeetingId)
      .single();

    if (actionItemsToProcess.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        tasks_created: 0,
        message: 'No action items to bridge' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Map priority to score
    const priorityToScore = (priority?: string): number => {
      switch (priority) {
        case 'high': return 90;
        case 'medium': return 60;
        case 'low': return 30;
        default: return 50;
      }
    };

    // Create pilot tasks from action items
    const tasksToCreate = actionItemsToProcess.map((item: ActionItem) => ({
      user_id: user.id,
      title: item.task,
      description: `From meeting: ${meeting?.title || 'Meeting'}\n\nAssignee: ${item.owner || 'Unassigned'}\nDeadline: ${item.deadline || 'Not specified'}`,
      task_type: 'meeting_followup',
      priority_score: priorityToScore(item.priority),
      status: 'pending',
      context: {
        meeting_id: targetMeetingId,
        recording_id,
        meeting_title: meeting?.title,
        meeting_date: meeting?.scheduled_start,
        timestamp_ms: item.timestamp_ms,
        original_owner: item.owner,
        original_deadline: item.deadline,
        source: 'meeting_bridge'
      },
      due_date: item.deadline ? new Date(item.deadline).toISOString() : null
    }));

    const { data: createdTasks, error: insertError } = await supabase
      .from('pilot_tasks')
      .insert(tasksToCreate)
      .select('id, title');

    if (insertError) {
      console.error('Error creating pilot tasks:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to create tasks' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update meeting insights with bridged status
    if (targetMeetingId) {
      await supabase
        .from('meeting_insights')
        .upsert({
          meeting_id: targetMeetingId,
          action_items: actionItemsToProcess,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'meeting_id'
        });
    }

    console.log(`Bridged ${createdTasks?.length || 0} action items to Club Pilot`);

    return new Response(JSON.stringify({ 
      success: true, 
      tasks_created: createdTasks?.length || 0,
      tasks: createdTasks
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Bridge meeting to pilot error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
