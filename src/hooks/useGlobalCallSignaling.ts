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
  conversation?: {
    id: string;
  };
};

/**
 * Global call signaling hook that subscribes to ALL incoming calls
 * for the current user across all their conversations.
 */
export function useGlobalCallSignaling() {
  const { user } = useAuth();
  const [incomingInvitations, setIncomingInvitations] = useState<CallInvitation[]>([]);
  const [userConversationIds, setUserConversationIds] = useState<string[]>([]);

  // Load user's conversations
  const loadUserConversations = useCallback(async () => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (error) {
      console.error('[GlobalCallSignaling] Error loading conversations:', error);
      return [];
    }

    const ids = data?.map(p => p.conversation_id) || [];
    setUserConversationIds(ids);
    return ids;
  }, [user]);

  // Load active ringing invitations for all user's conversations
  const loadInvitations = useCallback(async () => {
    if (!user) return;

    const conversationIds = userConversationIds.length > 0 
      ? userConversationIds 
      : await loadUserConversations();

    if (conversationIds.length === 0) {
      console.log('[GlobalCallSignaling] No conversations found for user');
      return;
    }

    const { data, error } = await supabase
      .from('call_invitations')
      .select('*')
      .in('conversation_id', conversationIds)
      .eq('status', 'ringing')
      .neq('caller_id', user.id) // Exclude calls I initiated
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GlobalCallSignaling] Error loading invitations:', error);
      return;
    }

    if (!data || data.length === 0) {
      setIncomingInvitations([]);
      return;
    }

    console.log('[GlobalCallSignaling] Found ringing invitations:', data.length);

    // Fetch caller information for each invitation
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

    setIncomingInvitations(invitationsWithCallers);
  }, [user, userConversationIds, loadUserConversations]);

  // Initial load and subscribe to realtime changes
  useEffect(() => {
    if (!user) return;

    // Initial load
    loadUserConversations().then(() => loadInvitations());

    // Subscribe to ALL call_invitations changes (not filtered by conversation)
    // We'll filter client-side based on user's conversations
    const channel = supabase
      .channel('global-call-invitations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_invitations'
        },
        (payload) => {
          console.log('[GlobalCallSignaling] Realtime update:', payload.eventType);
          // Reload invitations on any change
          loadInvitations();
        }
      )
      .subscribe((status) => {
        console.log('[GlobalCallSignaling] Subscription status:', status);
      });

    return () => {
      channel.unsubscribe();
    };
  }, [user, loadInvitations, loadUserConversations]);

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
      console.error('[GlobalCallSignaling] Error accepting call:', error);
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
      console.error('[GlobalCallSignaling] Error declining call:', error);
    }
  }, []);

  return {
    incomingInvitations,
    acceptCall,
    declineCall
  };
}
