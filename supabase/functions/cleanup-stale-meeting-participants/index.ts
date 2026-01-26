/**
 * Cleanup Stale Meeting Participants
 * Marks participants as disconnected if they haven't sent a heartbeat in 2+ minutes
 * Should be run periodically via cron job
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[Cleanup] 🧹 Stale participant cleanup started at:', new Date().toISOString());

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Stale threshold: 2 minutes without heartbeat
    const staleThreshold = new Date(Date.now() - 2 * 60 * 1000);

    // Find and update stale participants
    const { data: staleParticipants, error } = await supabase
      .from('meeting_participants')
      .update({ 
        left_at: new Date().toISOString(), 
        status: 'disconnected' 
      })
      .is('left_at', null)
      .lt('last_seen', staleThreshold.toISOString())
      .select('id, meeting_id, user_id, guest_name, last_seen');

    if (error) {
      console.error('[Cleanup] ❌ Error updating stale participants:', error);
      throw error;
    }

    const cleanedCount = staleParticipants?.length || 0;
    
    console.log('[Cleanup] ✅ Marked', cleanedCount, 'stale participants as disconnected');
    
    if (cleanedCount > 0) {
      console.log('[Cleanup] 📋 Cleaned participants:', staleParticipants?.map(p => ({
        id: p.id,
        meeting_id: p.meeting_id,
        user_or_guest: p.user_id || p.guest_name,
        last_seen: p.last_seen
      })));
    }

    // Also check for meetings that should be marked as completed
    // (no active participants for 5+ minutes)
    const completionThreshold = new Date(Date.now() - 5 * 60 * 1000);
    
    const { data: orphanedMeetings, error: meetingError } = await supabase
      .from('meetings')
      .select('id, title')
      .eq('status', 'in_progress')
      .lt('updated_at', completionThreshold.toISOString());

    if (!meetingError && orphanedMeetings && orphanedMeetings.length > 0) {
      // Check each meeting for active participants
      for (const meeting of orphanedMeetings) {
        const { count } = await supabase
          .from('meeting_participants')
          .select('*', { count: 'exact', head: true })
          .eq('meeting_id', meeting.id)
          .is('left_at', null);

        if (!count || count === 0) {
          // No active participants - mark meeting as completed
          await supabase
            .from('meetings')
            .update({ status: 'completed' })
            .eq('id', meeting.id);
          
          console.log('[Cleanup] ✅ Marked orphaned meeting as completed:', meeting.title);
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      cleaned: cleanedCount,
      threshold: staleThreshold.toISOString(),
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Cleanup] ❌ Cleanup failed:', error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
