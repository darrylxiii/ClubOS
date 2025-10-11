import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";
import { useState } from "react";
import { AudioCallInterface } from "./AudioCallInterface";

interface AudioCallLauncherProps {
  conversationId: string;
  participantName: string;
}

export function AudioCallLauncher({ conversationId, participantName }: AudioCallLauncherProps) {
  const [callActive, setCallActive] = useState(false);

  const handleStartCall = () => {
    setCallActive(true);
  };

  const handleEndCall = () => {
    setCallActive(false);
  };

  return (
    <>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={handleStartCall}
        className="h-9 w-9 hover:bg-primary/10 hover:text-primary"
        title="Start voice call"
      >
        <Phone className="h-5 w-5" />
      </Button>

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
