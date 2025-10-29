import { useEffect, useState } from "react";
import { useCallSignaling } from "@/hooks/useCallSignaling";
import { IncomingCallBanner } from "./IncomingCallBanner";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

interface CallNotificationManagerProps {
  conversationId?: string;
  onAcceptCall: (invitationId: string, callType: 'audio' | 'video') => void;
}

export function CallNotificationManager({
  conversationId,
  onAcceptCall
}: CallNotificationManagerProps) {
  const { toast } = useToast();
  const { incomingInvitations, acceptCall, declineCall } = useCallSignaling(conversationId);
  const [handledInvitations, setHandledInvitations] = useState<Set<string>>(new Set());

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
        toast({
          title: "Call ended",
          description: "The caller ended the call",
          variant: "default"
        });
      }
    });
  }, [incomingInvitations, toast]);

  const handleAccept = async (invitationId: string, callType: string) => {
    await acceptCall(invitationId);
    onAcceptCall(invitationId, callType as 'audio' | 'video');
  };

  const handleDecline = async (invitationId: string) => {
    await declineCall(invitationId);
    toast({
      title: "Call declined",
      description: "You declined the call",
      variant: "default"
    });
  };

  // Only show the first ringing invitation
  const activeInvitation = incomingInvitations.find(inv => inv.status === 'ringing');

  if (!activeInvitation) return null;

  const callerName = activeInvitation.caller?.full_name || 
                     activeInvitation.caller?.email || 
                     'Unknown';
  const callerAvatar = activeInvitation.caller?.avatar_url;

  return (
    <IncomingCallBanner
      callerName={callerName}
      callerAvatar={callerAvatar}
      callType={activeInvitation.call_type as 'audio' | 'video'}
      createdAt={activeInvitation.created_at}
      onAccept={() => handleAccept(activeInvitation.id, activeInvitation.call_type)}
      onDecline={() => handleDecline(activeInvitation.id)}
    />
  );
}
