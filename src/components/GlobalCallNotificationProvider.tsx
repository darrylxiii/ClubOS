import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalCallSignaling } from '@/hooks/useGlobalCallSignaling';
import { IncomingCallCard } from '@/components/messages/IncomingCallCard';
import { notify } from '@/lib/notify';

/**
 * Global provider that renders incoming call notifications anywhere in the app.
 * Uses the global call signaling hook to listen for all incoming calls
 * across all user's conversations.
 */
export function GlobalCallNotificationProvider() {
  const navigate = useNavigate();
  const { incomingInvitations, acceptCall, declineCall } = useGlobalCallSignaling();
  const [handledInvitations, setHandledInvitations] = useState<Set<string>>(new Set());
  const [hiddenInvitations, setHiddenInvitations] = useState<Set<string>>(new Set());

  // Show browser notification if tab is not focused
  useEffect(() => {
    if (incomingInvitations.length === 0) return;

    incomingInvitations.forEach(invitation => {
      if (handledInvitations.has(invitation.id)) return;

      console.log('[GlobalCallNotification] New incoming call:', invitation.id);

      if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        const callerName = invitation.caller?.full_name || invitation.caller?.email || 'Someone';
        new Notification(`Incoming ${invitation.call_type} call`, {
          body: `${callerName} is calling you`,
          icon: invitation.caller?.avatar_url || undefined,
          tag: invitation.id
        });
      }

      setHandledInvitations(prev => new Set(prev).add(invitation.id));
    });
  }, [incomingInvitations, handledInvitations]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Handle invitation status changes (cancelled by caller)
  useEffect(() => {
    incomingInvitations.forEach(invitation => {
      if (invitation.status === 'cancelled') {
        setHiddenInvitations(prev => new Set(prev).add(invitation.id));
        notify.info("Call ended", { description: "The caller ended the call" });
      }
    });
  }, [incomingInvitations]);

  const handleAccept = useCallback(async (invitation: typeof incomingInvitations[0]) => {
    // Hide card immediately (optimistic UI)
    setHiddenInvitations(prev => new Set(prev).add(invitation.id));
    
    // Update database
    await acceptCall(invitation.id);

    // Navigate to the conversation with the call active
    // Pass state to indicate we should join the call
    navigate(`/messages?conversation=${invitation.conversation_id}`, {
      state: { 
        activeCallId: invitation.id,
        callType: invitation.call_type
      }
    });

    notify.success("Call accepted", { description: "Connecting to call..." });
  }, [acceptCall, navigate]);

  const handleDecline = useCallback(async (invitationId: string) => {
    // Hide card immediately (optimistic UI)
    setHiddenInvitations(prev => new Set(prev).add(invitationId));
    
    // Update database
    await declineCall(invitationId);

    notify.info("Call declined", { description: "You declined the call" });
  }, [declineCall]);

  // Find the first active ringing invitation that hasn't been hidden
  const activeInvitation = incomingInvitations.find(
    inv => inv.status === 'ringing' && !hiddenInvitations.has(inv.id)
  );

  if (!activeInvitation) return null;

  const callerName = activeInvitation.caller?.full_name || 
                     activeInvitation.caller?.email || 
                     'Unknown';
  const callerAvatar = activeInvitation.caller?.avatar_url;

  return (
    <IncomingCallCard
      key={activeInvitation.id}
      callerName={callerName}
      callerAvatar={callerAvatar ?? undefined}
      callType={activeInvitation.call_type as 'audio' | 'video'}
      createdAt={activeInvitation.created_at}
      onAccept={() => handleAccept(activeInvitation)}
      onDecline={() => handleDecline(activeInvitation.id)}
    />
  );
}
