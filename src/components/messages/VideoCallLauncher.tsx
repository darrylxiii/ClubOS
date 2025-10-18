import { Button } from "@/components/ui/button";
import { Video } from "lucide-react";
import { useState, useEffect } from "react";
import { VideoCallInterface } from "./VideoCallInterface";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface VideoCallLauncherProps {
  conversationId: string;
  participantName: string;
}

export function VideoCallLauncher({ conversationId, participantName }: VideoCallLauncherProps) {
  const { user } = useAuth();
  const [callActive, setCallActive] = useState(false);
  const [participantAvatar, setParticipantAvatar] = useState<string>();

  useEffect(() => {
    const loadParticipantAvatar = async () => {
      // Get conversation participants
      const { data: conversation } = await supabase
        .from('conversations')
        .select('participants:conversation_participants(user_id, profile:profiles(avatar_url))')
        .eq('id', conversationId)
        .single();

      if (conversation?.participants) {
        // Find the other participant (not current user)
        const otherParticipant = (conversation.participants as any[]).find(
          p => p.user_id !== user?.id
        );
        
        if (otherParticipant?.profile?.avatar_url) {
          setParticipantAvatar(otherParticipant.profile.avatar_url);
        }
      }
    };

    if (conversationId) {
      loadParticipantAvatar();
    }
  }, [conversationId, user?.id]);

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
        title="Start video call"
      >
        <Video className="h-5 w-5" />
      </Button>

      {callActive && (
        <VideoCallInterface 
          conversationId={conversationId}
          participantName={participantName}
          participantAvatar={participantAvatar}
          onEnd={handleEndCall}
        />
      )}
    </>
  );
}
