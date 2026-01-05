import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReminderRequest {
  meetingId?: string;
  applicationId?: string;
  evaluatorIds?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { meetingId, applicationId, evaluatorIds }: ReminderRequest = await req.json();

    console.log('Processing scorecard reminders:', { meetingId, applicationId, evaluatorIds });

    // Get evaluators who haven't submitted scorecards
    let pendingEvaluators: string[] = [];

    if (meetingId) {
      const { data: evaluators } = await supabase
        .from('meeting_evaluators')
        .select('evaluator_id')
        .eq('meeting_id', meetingId)
        .eq('scorecard_submitted', false);

      pendingEvaluators = evaluators?.map(e => e.evaluator_id) || [];
    } else if (evaluatorIds) {
      pendingEvaluators = evaluatorIds;
    }

    if (pendingEvaluators.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No pending evaluators found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get meeting details if available
    let meetingTitle = 'Interview';
    let candidateName = 'the candidate';

    if (meetingId) {
      const { data: meeting } = await supabase
        .from('meetings')
        .select(`
          title,
          candidate_id,
          candidate_profiles:candidate_id (full_name)
        `)
        .eq('id', meetingId)
        .single();

      if (meeting) {
        meetingTitle = meeting.title || 'Interview';
        candidateName = (meeting.candidate_profiles as any)?.full_name || 'the candidate';
      }
    }

    // Get evaluator profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', pendingEvaluators);

    const remindersCreated: string[] = [];

    for (const profile of profiles || []) {
      // Create in-app notification
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: profile.id,
          type: 'scorecard_reminder',
          title: 'Scorecard Pending',
          message: `Please submit your scorecard for ${candidateName} from "${meetingTitle}"`,
          data: {
            meeting_id: meetingId,
            application_id: applicationId,
          },
        });

      if (!notifError) {
        remindersCreated.push(profile.id);
      }

      // Update reminder_sent_at in meeting_evaluators
      if (meetingId) {
        await supabase
          .from('meeting_evaluators')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('meeting_id', meetingId)
          .eq('evaluator_id', profile.id);
      }
    }

    console.log(`Sent ${remindersCreated.length} scorecard reminders`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        reminders_sent: remindersCreated.length,
        evaluator_ids: remindersCreated 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Scorecard reminder error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
