import { useEffect, useState } from "react";
import { useCallSignaling } from "@/hooks/useCallSignaling";
import { IncomingCallBanner } from "./IncomingCallBanner";
import { notify } from "@/lib/notify";

interface CallNotificationManagerProps {
  conversationId?: string;
  onAcceptCall: (invitationId: string, callType: 'audio' | 'video') => void;
}

export function CallNotificationManager({
  conversationId,
  onAcceptCall
}: CallNotificationManagerProps) {
  const { incomingInvitations, acceptCall, declineCall } = useCallSignaling(conversationId);
  const [handledInvitations, setHandledInvitations] = useState<Set<string>>(new Set());
  const [hiddenInvitations, setHiddenInvitations] = useState<Set<string>>(new Set());

  // Show browser notification if tab is not focused
  useEffect(() => {
    if (incomingInvitations.length === 0) return;

    incomingInvitations.forEach(invitation => {
      if (handledInvitations.has(invitation.id)) return;

      if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        const callerName = invitation.caller?.full_name || invitation.caller?.email || 'Someone';
        new Notification(`Incoming ${invitation.call_type} call`, {
          body: `${callerName} is calling you`,
          icon: invitation.caller?.avatar_url,
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

  // Handle invitation status changes
  useEffect(() => {
    incomingInvitations.forEach(invitation => {
      if (invitation.status === 'cancelled') {
        // Hide immediately
        setHiddenInvitations(prev => new Set(prev).add(invitation.id));
        
        notify.info("Call ended", {
          description: "The caller ended the call",
        });
      }
    });
  }, [incomingInvitations]);

  const handleAccept = async (invitationId: string, callType: string) => {
    // Optimistic UI: hide banner immediately
    setHiddenInvitations(prev => new Set(prev).add(invitationId));
    
    // Then update database
    await acceptCall(invitationId);
    onAcceptCall(invitationId, callType as 'audio' | 'video');
  };

  const handleDecline = async (invitationId: string) => {
    // Optimistic UI: hide banner immediately
    setHiddenInvitations(prev => new Set(prev).add(invitationId));
    
    // Then update database
    await declineCall(invitationId);
    
    notify.info("Call declined", {
      description: "You declined the call",
    });
  };

  // Only show the first ringing invitation that hasn't been hidden
  const activeInvitation = incomingInvitations.find(
    inv => inv.status === 'ringing' && !hiddenInvitations.has(inv.id)
  );

  if (!activeInvitation) return null;

  const callerName = activeInvitation.caller?.full_name || 
                     activeInvitation.caller?.email || 
                     'Unknown';
  const callerAvatar = activeInvitation.caller?.avatar_url;

  return (
    <IncomingCallBanner
      key={activeInvitation.id}
      callerName={callerName}
      callerAvatar={callerAvatar}
      callType={activeInvitation.call_type as 'audio' | 'video'}
      createdAt={activeInvitation.created_at}
      onAccept={() => handleAccept(activeInvitation.id, activeInvitation.call_type)}
      onDecline={() => handleDecline(activeInvitation.id)}
    />
  );
}
