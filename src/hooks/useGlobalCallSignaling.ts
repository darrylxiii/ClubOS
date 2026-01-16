import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/integrations/supabase/types';

type CallInvitation = Database['public']['Tables']['call_invitations']['Row'] & {
  caller?: {
    full_name?: string | null;
    avatar_url?: string | null;
    email?: string | null;
  };
  conversation?: {
    id: string;
  };
};

/**
 * Global call signaling hook that subscribes to ALL incoming calls
 * for the current user across all their conversations.
 * Fixed to prevent subscription cycling loop by using refs.
 */
export function useGlobalCallSignaling() {
  const { user } = useAuth();
  const [incomingInvitations, setIncomingInvitations] = useState<CallInvitation[]>([]);
  
  // Use ref to prevent subscription cycling - store conversation IDs without causing re-renders
  const userConversationIdsRef = useRef<string[]>([]);
  const isLoadingRef = useRef(false);

  // Load user's conversations - stable callback
  const loadUserConversations = useCallback(async (): Promise<string[]> => {
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
    userConversationIdsRef.current = ids;
    return ids;
  }, [user]);

  // Load active ringing invitations - stable callback using ref
  const loadInvitations = useCallback(async () => {
    if (!user || isLoadingRef.current) return;
    
    isLoadingRef.current = true;

    try {
      let conversationIds = userConversationIdsRef.current;
      
      if (conversationIds.length === 0) {
        conversationIds = await loadUserConversations();
      }

      if (conversationIds.length === 0) {
        setIncomingInvitations([]);
        return;
      }

      const { data, error } = await supabase
        .from('call_invitations')
        .select('*')
        .in('conversation_id', conversationIds)
        .eq('status', 'ringing')
        .neq('caller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[GlobalCallSignaling] Error loading invitations:', error);
        return;
      }

      if (!data || data.length === 0) {
        setIncomingInvitations([]);
        return;
      }

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
    } finally {
      isLoadingRef.current = false;
    }
  }, [user, loadUserConversations]);

  // Single effect for initial load and subscription - minimal dependencies
  useEffect(() => {
    if (!user) return;

    let mounted = true;

    // Initial load
    loadUserConversations().then(() => {
      if (mounted) loadInvitations();
    });

    // Single stable subscription
    const channel = supabase
      .channel(`global-call-invitations-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_invitations'
        },
        () => {
          if (mounted) loadInvitations();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      channel.unsubscribe();
    };
  }, [user?.id]); // Only depend on user.id, not callbacks

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
