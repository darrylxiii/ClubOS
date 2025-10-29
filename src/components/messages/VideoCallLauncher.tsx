import { Button } from "@/components/ui/button";
import { Video } from "lucide-react";
import { useState } from "react";
import { VideoCallInterface } from "./VideoCallInterface";
import { CallInitiationDialog } from "./CallInitiationDialog";
import { useCallSignaling } from "@/hooks/useCallSignaling";

interface VideoCallLauncherProps {
  conversationId: string;
  participantName: string;
  participantAvatar?: string;
  onSendMessage: (content: string, metadata?: Record<string, any>) => Promise<void>;
}

export function VideoCallLauncher({
  conversationId,
  participantName,
  participantAvatar,
  onSendMessage
}: VideoCallLauncherProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [invitationId, setInvitationId] = useState<string | null>(null);
  const { initiateCall, cancelCall } = useCallSignaling(conversationId);

  const handleStartVideoCall = async () => {
    setShowDialog(false);
    const invitation = await initiateCall('video');
    if (invitation) {
      setInvitationId(invitation.id);
      setCallActive(true);
    }
  };

  const handleCancelCall = async () => {
    if (invitationId) {
      await cancelCall(invitationId);
      setInvitationId(null);
    }
    setCallActive(false);
  };

  const handleEndCall = async (duration: number, participantCount: number) => {
    // Cancel invitation first if it exists
    if (invitationId) {
      await cancelCall(invitationId);
      setInvitationId(null);
    }
    
    setCallActive(false);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    const durationText = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
    
    await onSendMessage(
      `📹 Video call ended • Duration: ${durationText} • ${participantCount} participant${participantCount !== 1 ? 's' : ''}`,
      { 
        type: 'call_log',
        call_type: 'video',
        duration_seconds: duration,
        participant_count: participantCount,
        timestamp: new Date().toISOString()
      }
    );
  };

  return (
    <>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => setShowDialog(true)}
        className="h-9 w-9 hover:bg-primary/10 hover:text-primary"
        title="Start video call"
      >
        <Video className="h-5 w-5" />
      </Button>

      <CallInitiationDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        participantName={participantName}
        participantAvatar={participantAvatar}
        onStartAudioCall={() => setShowDialog(false)}
        onStartVideoCall={handleStartVideoCall}
      />

      {callActive && (
        <VideoCallInterface
          conversationId={conversationId}
          participantName={participantName}
          participantAvatar={participantAvatar}
          invitationId={invitationId || undefined}
          onEnd={handleEndCall}
          onCancel={handleCancelCall}
        />
      )}
    </>
  );
}
