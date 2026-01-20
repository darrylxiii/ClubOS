import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface InviteParticipant {
  email?: string;
  userId?: string;
  name?: string;
  role?: 'participant' | 'observer';
}

export interface MeetingInvitation {
  id: string;
  meeting_id: string;
  invitee_user_id?: string;
  invitee_email?: string;
  status: 'pending' | 'accepted' | 'declined' | 'tentative';
  invitation_method: 'email' | 'link' | 'dropdown' | 'template';
  sent_at?: string;
  responded_at?: string;
  response_message?: string;
}

interface Meeting {
  id: string;
  title: string;
  scheduled_start: string;
  scheduled_end: string;
  meeting_code: string;
  host_id: string;
}

/**
 * Send meeting invitations to participants
 */
export async function sendInvitations(
  meetingId: string,
  participants: InviteParticipant[],
  customMessage?: string
): Promise<{ success: boolean; invitations: MeetingInvitation[]; errors: string[] }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get meeting details
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('id, title, scheduled_start, scheduled_end, meeting_code, host_id')
      .eq('id', meetingId)
      .single();

    if (meetingError || !meeting) {
      throw new Error('Meeting not found');
    }

    // Get inviter profile
    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    const inviterName = inviterProfile?.full_name || user.email || 'Someone';

    const invitations: MeetingInvitation[] = [];
    const errors: string[] = [];

    // Create invitations for each participant
    for (const participant of participants) {
      try {
        // Determine if user exists by email
        let inviteeUserId: string | undefined;
        if (participant.email) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', participant.email)
            .single();
          
          if (profile) {
            inviteeUserId = profile.id;
          }
        } else if (participant.userId) {
          inviteeUserId = participant.userId;
        }

        // Create invitation record
        const { data: invitation, error: inviteError } = await supabase
          .from('meeting_invitations')
          .insert({
            meeting_id: meetingId,
            invitee_user_id: inviteeUserId || null,
            invitee_email: participant.email || null,
            inviter_id: user.id,
            invitation_method: 'email',
            status: 'pending',
          })
          .select()
          .single();

        if (inviteError) {
          errors.push(`Failed to invite ${participant.email || participant.name || 'participant'}: ${inviteError.message}`);
          continue;
        }

        invitations.push(invitation as unknown as MeetingInvitation);

        // Send email invitation if email provided
        if (participant.email) {
          try {
            const meetingUrl = `${window.location.origin}/meetings/${meeting.meeting_code}`;
            const duration = Math.round(
              (new Date(meeting.scheduled_end).getTime() - new Date(meeting.scheduled_start).getTime()) / 60000
            );

            const { error: emailError } = await supabase.functions.invoke('send-meeting-invitation-email', {
              body: {
                invitationId: invitation.id,
                inviteeEmail: participant.email,
                inviterName,
                meetingTitle: meeting.title,
                meetingStartTime: meeting.scheduled_start,
                meetingDuration: duration,
                meetingUrl,
                customMessage,
              },
            });

            if (emailError) {
              console.error('Error sending invitation email:', emailError);
              // Don't fail the whole operation if email fails
              errors.push(`Invitation created but email failed for ${participant.email}`);
            }
          } catch (emailErr: unknown) {
            const msg = emailErr instanceof Error ? emailErr.message : 'Unknown error';
            console.error('Error sending email:', emailErr);
            errors.push(`Email failed for ${participant.email}: ${msg}`);
          }
        }

        // If user exists, also add them as participant (they can accept later)
        if (inviteeUserId) {
          await supabase
            .from('meeting_participants')
            .upsert({
              meeting_id: meetingId,
              user_id: inviteeUserId,
              role: participant.role || 'participant',
              status: 'invited',
            }, {
              onConflict: 'meeting_id,user_id',
            });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Error inviting ${participant.email || participant.name || 'participant'}: ${msg}`);
      }
    }

    return {
      success: invitations.length > 0,
      invitations,
      errors,
    };
  } catch (error: unknown) {
    console.error('Error sending invitations:', error);
    throw error;
  }
}

/**
 * Resend an invitation
 */
export async function resendInvitation(invitationId: string): Promise<boolean> {
  try {
    const { data: invitation, error: inviteError } = await supabase
      .from('meeting_invitations')
      .select('*, meetings(title, scheduled_start, scheduled_end, meeting_code, host_id)')
      .eq('id', invitationId)
      .single();

    if (inviteError || !invitation) {
      throw new Error('Invitation not found');
    }

    if (!invitation.invitee_email) {
      throw new Error('No email address for this invitation');
    }

    const meeting = invitation.meetings as unknown as Meeting;
    const meetingUrl = `${window.location.origin}/meetings/${meeting.meeting_code}`;
    const duration = Math.round(
      (new Date(meeting.scheduled_end).getTime() - new Date(meeting.scheduled_start).getTime()) / 60000
    );

    // Get inviter name
    const { data: { user } } = await supabase.auth.getUser();
    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user?.id)
      .single();

    const inviterName = inviterProfile?.full_name || user?.email || 'Someone';

    // Send email
    const { error: emailError } = await supabase.functions.invoke('send-meeting-invitation-email', {
      body: {
        invitationId: invitation.id,
        inviteeEmail: invitation.invitee_email,
        inviterName,
        meetingTitle: meeting.title,
        meetingStartTime: meeting.scheduled_start,
        meetingDuration: duration,
        meetingUrl,
      },
    });

    if (emailError) {
      throw emailError;
    }

    // Update sent_at timestamp
    await supabase
      .from('meeting_invitations')
      .update({ sent_at: new Date().toISOString() })
      .eq('id', invitationId);

    return true;
  } catch (error: unknown) {
    console.error('Error resending invitation:', error);
    throw error;
  }
}

/**
 * Cancel an invitation
 */
export async function cancelInvitation(invitationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('meeting_invitations')
      .update({ status: 'declined' })
      .eq('id', invitationId);

    if (error) throw error;
    return true;
  } catch (error: unknown) {
    console.error('Error canceling invitation:', error);
    throw error;
  }
}

/**
 * Get invitations for a meeting
 */
export async function getMeetingInvitations(meetingId: string): Promise<MeetingInvitation[]> {
  try {
    const { data, error } = await supabase
      .from('meeting_invitations')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as MeetingInvitation[];
  } catch (error: unknown) {
    console.error('Error fetching invitations:', error);
    throw error;
  }
}

/**
 * Accept an invitation
 */
export async function acceptInvitation(invitationId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data: invitation, error: inviteError } = await supabase
      .from('meeting_invitations')
      .select('*, meetings(id)')
      .eq('id', invitationId)
      .single();

    if (inviteError || !invitation) {
      throw new Error('Invitation not found');
    }

    // Update invitation status
    const { error: updateError } = await supabase
      .from('meeting_invitations')
      .update({
        status: 'accepted',
        responded_at: new Date().toISOString(),
      })
      .eq('id', invitationId);

    if (updateError) throw updateError;

    // Add user as participant if not already
    const meeting = invitation.meetings as unknown as Meeting;
    await supabase
      .from('meeting_participants')
      .upsert({
        meeting_id: meeting.id,
        user_id: user.id,
        role: 'participant',
        status: 'accepted',
        joined_at: new Date().toISOString(),
      }, {
        onConflict: 'meeting_id,user_id',
      });

    return true;
  } catch (error: unknown) {
    console.error('Error accepting invitation:', error);
    throw error;
  }
}

/**
 * Decline an invitation
 */
export async function declineInvitation(invitationId: string, message?: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('meeting_invitations')
      .update({
        status: 'declined',
        responded_at: new Date().toISOString(),
        response_message: message,
      })
      .eq('id', invitationId);

    if (error) throw error;
    return true;
  } catch (error: unknown) {
    console.error('Error declining invitation:', error);
    throw error;
  }
}


