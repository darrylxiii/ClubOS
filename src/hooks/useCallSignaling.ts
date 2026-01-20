import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/integrations/supabase/types';

type CallInvitation = Database['public']['Tables']['call_invitations']['Row'] & {
  caller?: {
    full_name?: string;
    avatar_url?: string;
    email?: string;
  };
};

export function useCallSignaling(conversationId?: string) {
  const { user } = useAuth();
  const [incomingInvitations, setIncomingInvitations] = useState<CallInvitation[]>([]);
  const [outgoingInvitation, setOutgoingInvitation] = useState<CallInvitation | null>(null);

  // Load active invitations
  const loadInvitations = useCallback(async () => {
    if (!user || !conversationId) return;

    const { data, error } = await supabase
      .from('call_invitations')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('status', 'ringing')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading invitations:', error);
      return;
    }

    if (!data) return;

    // Fetch caller information from profiles table
    const invitationsWithCallers = await Promise.all(
      data.map(async (inv) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, email')
          .eq('id', inv.caller_id)
          .single();

        return {
          ...inv,
          caller: profile || undefined
        };
      })
    );

    // Separate incoming and outgoing
    const incoming = invitationsWithCallers.filter(inv => inv.caller_id !== user.id);
    const outgoing = invitationsWithCallers.find(inv => inv.caller_id === user.id) || null;

    setIncomingInvitations(incoming);
    setOutgoingInvitation(outgoing);
  }, [user, conversationId]);

  // Subscribe to invitation changes
  useEffect(() => {
    if (!conversationId) return;

    loadInvitations();

    const channel = supabase
      .channel(`call-invitations-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_invitations',
          filter: `conversation_id=eq.${conversationId}`
        },
        () => loadInvitations()
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [conversationId, loadInvitations]);

  // Auto-dismiss ringing invitations after 30 seconds
  useEffect(() => {
    incomingInvitations.forEach(invitation => {
      const createdAt = new Date(invitation.created_at).getTime();
      const now = Date.now();
      const elapsed = now - createdAt;
      const remaining = 30000 - elapsed;

      if (remaining > 0) {
        const timeout = setTimeout(async () => {
          await supabase
            .from('call_invitations')
            .update({ 
              status: 'missed',
              responded_at: new Date().toISOString()
            })
            .eq('id', invitation.id);
        }, remaining);

        return () => clearTimeout(timeout);
      }
    });
  }, [incomingInvitations]);

  // Initiate a call
  const initiateCall = useCallback(async (callType: 'audio' | 'video') => {
    if (!user || !conversationId) return null;

    // Get current user's info from profiles table
    const { data: currentUserInfo } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, email')
      .eq('id', user.id)
      .single();

    const { data, error } = await supabase
      .from('call_invitations')
      .insert({
        conversation_id: conversationId,
        caller_id: user.id,
        call_type: callType,
        status: 'ringing'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating invitation:', error);
      return null;
    }

    const invitation: CallInvitation = {
      ...data,
      caller: currentUserInfo || undefined
    };

    setOutgoingInvitation(invitation);
    return invitation;
  }, [user, conversationId]);

  // Accept a call
  const acceptCall = useCallback(async (invitationId: string) => {
    const { data, error } = await supabase
      .from('call_invitations')
      .update({ 
        status: 'accepted',
        responded_at: new Date().toISOString()
      })
      .eq('id', invitationId)
      .select()
      .single();

    if (error) {
      console.error('Error accepting call:', error);
      return null;
    }

    return data;
  }, []);

  // Decline a call
  const declineCall = useCallback(async (invitationId: string) => {
    const { error } = await supabase
      .from('call_invitations')
      .update({ 
        status: 'declined',
        responded_at: new Date().toISOString()
      })
      .eq('id', invitationId);

    if (error) {
      console.error('Error declining call:', error);
    }
  }, []);

  // Cancel a call (for caller)
  const cancelCall = useCallback(async (invitationId: string) => {
    const { error } = await supabase
      .from('call_invitations')
      .update({ 
        status: 'cancelled',
        responded_at: new Date().toISOString()
      })
      .eq('id', invitationId);

    if (error) {
      console.error('Error cancelling call:', error);
    }

    setOutgoingInvitation(null);
  }, []);

  return {
    incomingInvitations,
    outgoingInvitation,
    initiateCall,
    acceptCall,
    declineCall,
    cancelCall
  };
}
