import { createAuthenticatedHandler } from '../_shared/handler.ts';

Deno.serve(createAuthenticatedHandler(async (req, ctx) => {
    const { supabase, user, corsHeaders } = ctx;

    const { invitation_id, action } = await req.json();

    if (!invitation_id || !['accept', 'decline'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get invitation details
    const { data: invitation, error: inviteError } = await supabase
      .from('task_board_invitations')
      .select('*')
      .eq('id', invitation_id)
      .single();

    if (inviteError || !invitation) {
      return new Response(JSON.stringify({ error: 'Invitation not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if invitation is for this user
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    if (invitation.invitee_email !== profile?.email) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      await supabase
        .from('task_board_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation_id);

      return new Response(JSON.stringify({ error: 'Invitation expired' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'accept') {
      // Create board member
      const { error: memberError } = await supabase
        .from('task_board_members')
        .insert({
          board_id: invitation.board_id,
          user_id: user.id,
          role: invitation.role,
          invited_by: invitation.invited_by,
          accepted_at: new Date().toISOString(),
        });

      if (memberError) {
        console.error('Failed to create board member:', memberError);
        return new Response(JSON.stringify({ error: 'Failed to accept invitation' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update invitation status
      await supabase
        .from('task_board_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          invitee_user_id: user.id,
        })
        .eq('id', invitation_id);

      return new Response(
        JSON.stringify({ success: true, message: 'Invitation accepted' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Decline invitation
      await supabase
        .from('task_board_invitations')
        .update({ status: 'declined' })
        .eq('id', invitation_id);

      return new Response(
        JSON.stringify({ success: true, message: 'Invitation declined' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
}));
