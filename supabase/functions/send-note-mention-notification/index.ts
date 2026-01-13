import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { corsHeaders } from '../_shared/cors.ts';
import { sendMentionEmail } from '../_shared/email-notification-templates.ts';

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

    console.log('[mention-notification] Processing:', { noteId, candidateId, createdBy });

    // Get note details
    const { data: note, error: noteError } = await supabase
      .from('candidate_notes')
      .select('content, title, note_type')
      .eq('id', noteId)
      .single();

    if (noteError) {
      console.error('[mention-notification] Error fetching note:', noteError);
      throw noteError;
    }

    // Get creator details
    const { data: creator, error: creatorError } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', createdBy)
      .single();

    if (creatorError) {
      console.error('[mention-notification] Error fetching creator:', creatorError);
      throw creatorError;
    }

    // Get candidate details
    const { data: candidateProfile, error: candidateError } = await supabase
      .from('candidate_profiles')
      .select('user_id')
      .eq('id', candidateId)
      .single();

    if (candidateError) {
      console.error('[mention-notification] Error fetching candidate:', candidateError);
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

    console.log('[mention-notification] Found mentioned users:', mentionedUserIds);

    if (mentionedUserIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No mentions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get mentioned users' profiles and preferences
    const { data: mentionedUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', mentionedUserIds);

    if (usersError) {
      console.error('[mention-notification] Error fetching mentioned users:', usersError);
    }

    // Get notification preferences for mentioned users
    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('user_id, email_enabled, mention_email_enabled')
      .in('user_id', mentionedUserIds);

    const userPrefsMap = new Map(preferences?.map(p => [p.user_id, p]) || []);
    const usersMap = new Map(mentionedUsers?.map(u => [u.id, u]) || []);

    // Create mention records and notifications
    const results = await Promise.all(
      mentionedUserIds.map(async (userId) => {
        const user = usersMap.get(userId);
        const prefs = userPrefsMap.get(userId);

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
          console.error('[mention-notification] Error creating mention:', mentionError);
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
            action_url: `/candidate/${candidateId}?tab=team-assessment&section=notes&noteId=${noteId}`,
            metadata: {
              note_id: noteId,
              candidate_id: candidateId,
              created_by: createdBy,
              note_type: note.note_type,
            },
            is_read: false,
          });

        if (notifError) {
          console.error('[mention-notification] Error creating notification:', notifError);
          return { userId, success: false, error: notifError.message };
        }

        console.log('[mention-notification] In-app notification created for user:', userId);

        // Send email notification if enabled
        let emailSent = false;
        const shouldSendEmail = prefs?.email_enabled !== false && prefs?.mention_email_enabled !== false;
        
        if (shouldSendEmail && user?.email) {
          try {
            const noteExcerpt = note.content
              .replace(/@\[[a-f0-9-]{36}\]/g, '') // Remove mention markers
              .substring(0, 200);
            
            emailSent = await sendMentionEmail({
              recipientName: user.full_name || 'Team Member',
              recipientEmail: user.email,
              mentionedBy: creator?.full_name || 'A team member',
              candidateName,
              noteExcerpt: noteExcerpt || 'View the full note for details.',
              noteUrl: `https://app.thequantumclub.com/candidate/${candidateId}?tab=team-assessment&section=notes&noteId=${noteId}`,
            });
            
            console.log('[mention-notification] Email sent to', user.email, ':', emailSent);
          } catch (emailError) {
            console.error('[mention-notification] Email sending error:', emailError);
          }
        }

        return { userId, success: true, emailSent };
      })
    );

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    const emailsSent = results.filter(r => r.emailSent).length;

    console.log('[mention-notification] Complete:', { successCount, failedCount, emailsSent });

    return new Response(
      JSON.stringify({
        success: true,
        mentionsProcessed: mentionedUserIds.length,
        successCount,
        failedCount,
        emailsSent,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[mention-notification] Error:', error);
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
