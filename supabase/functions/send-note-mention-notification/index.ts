import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface NotificationRequest {
  noteId: string;
  candidateId: string;
  createdBy: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { noteId, candidateId, createdBy }: NotificationRequest = await req.json();

    console.log('Processing note mention notification:', { noteId, candidateId, createdBy });

    // Get note details
    const { data: note, error: noteError } = await supabase
      .from('candidate_notes')
      .select('content, title, note_type')
      .eq('id', noteId)
      .single();

    if (noteError) {
      console.error('Error fetching note:', noteError);
      throw noteError;
    }

    // Get creator details
    const { data: creator, error: creatorError } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', createdBy)
      .single();

    if (creatorError) {
      console.error('Error fetching creator:', creatorError);
      throw creatorError;
    }

    // Get candidate details
    const { data: candidateProfile, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('user_id')
      .eq('id', candidateId)
      .single();

    if (candidateError) {
      console.error('Error fetching candidate:', candidateError);
      throw candidateError;
    }

    let candidateName = 'a candidate';
    if (candidateProfile?.user_id) {
      const { data: candidateUser } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', candidateProfile.user_id)
        .single();
      
      if (candidateUser?.full_name) {
        candidateName = candidateUser.full_name;
      }
    }

    // Extract mentioned user IDs from content using regex pattern @[uuid]
    const mentionPattern = /@\[([a-f0-9-]{36})\]/g;
    const mentions = [...note.content.matchAll(mentionPattern)];
    const mentionedUserIds = [...new Set(mentions.map(match => match[1]))];

    console.log('Found mentioned users:', mentionedUserIds);

    if (mentionedUserIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No mentions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create mention records and notifications
    const results = await Promise.all(
      mentionedUserIds.map(async (userId) => {
        // Insert mention record
        const { error: mentionError } = await supabase
          .from('note_mentions')
          .insert({
            note_id: noteId,
            mentioned_user_id: userId,
            notified_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (mentionError && mentionError.code !== '23505') { // Ignore duplicate key error
          console.error('Error creating mention:', mentionError);
          return { userId, success: false, error: mentionError.message };
        }

        // Create in-app notification
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            title: 'You were mentioned in a note',
            message: `${creator?.full_name || 'Someone'} mentioned you in a note about ${candidateName}`,
            type: 'mention',
            category: 'notes',
            action_url: `/candidate/${candidateId}`,
            metadata: {
              note_id: noteId,
              candidate_id: candidateId,
              created_by: createdBy,
              note_type: note.note_type,
            },
            is_read: false,
          });

        if (notifError) {
          console.error('Error creating notification:', notifError);
          return { userId, success: false, error: notifError.message };
        }

        console.log('Notification created for user:', userId);
        return { userId, success: true };
      })
    );

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        mentionsProcessed: mentionedUserIds.length,
        successCount,
        failedCount,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-note-mention-notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
