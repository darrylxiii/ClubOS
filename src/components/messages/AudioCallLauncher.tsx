import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";
import { useState } from "react";
import { AudioCallInterface } from "./AudioCallInterface";
import { CallInitiationDialog } from "./CallInitiationDialog";
import { useCallSignaling } from "@/hooks/useCallSignaling";

interface AudioCallLauncherProps {
  conversationId: string;
  participantName: string;
  participantAvatar?: string;
  onSendMessage: (content: string, metadata?: Record<string, any>) => Promise<void>;
}

export function AudioCallLauncher({ conversationId, participantName, participantAvatar, onSendMessage }: AudioCallLauncherProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const { initiateCall } = useCallSignaling(conversationId);

  const handleStartAudioCall = async () => {
    setShowDialog(false);
    await initiateCall('audio');
    setCallActive(true);
  };

  const handleEndCall = async (duration: number) => {
    setCallActive(false);
    
    // Send system message with call log
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    const durationText = minutes > 0 
      ? `${minutes}m ${seconds}s` 
      : `${seconds}s`;
    
    await onSendMessage(
      `📞 Voice call ended • Duration: ${durationText}`,
      { 
        type: 'call_log',
        call_type: 'audio',
        duration_seconds: duration,
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
        title="Start voice call"
      >
        <Phone className="h-5 w-5" />
      </Button>

      <CallInitiationDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        participantName={participantName}
        participantAvatar={participantAvatar}
        onStartAudioCall={handleStartAudioCall}
        onStartVideoCall={() => setShowDialog(false)}
      />

      {callActive && (
        <AudioCallInterface 
          conversationId={conversationId}
          participantName={participantName}
          onEnd={handleEndCall}
        />
      )}
    </>
  );
}
