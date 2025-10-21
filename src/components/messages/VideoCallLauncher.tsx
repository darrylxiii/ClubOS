import { Button } from "@/components/ui/button";
import { Video } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { VideoCallInterface } from "./VideoCallInterface";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface VideoCallLauncherProps {
  conversationId: string;
  participantName: string;
  onSendMessage: (content: string, metadata?: Record<string, any>) => Promise<void>;
}

export function VideoCallLauncher({ conversationId, participantName, onSendMessage }: VideoCallLauncherProps) {
  const { user } = useAuth();
  const [callActive, setCallActive] = useState(false);
  const [participantAvatar, setParticipantAvatar] = useState<string>();
  const callStartTimeRef = useRef<number>(0);
  const sessionIdRef = useRef<string>();

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
    callStartTimeRef.current = Date.now();
    setCallActive(true);
  };

  const handleEndCall = async (sessionId?: string) => {
    setCallActive(false);
    
    // Calculate duration
    const durationSeconds = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    const durationText = minutes > 0 
      ? `${minutes}m ${seconds}s` 
      : `${seconds}s`;
    
    // Get participant count from session
    let participantCount = 1; // At least the caller
    if (sessionId) {
      const { data: participants } = await supabase
        .from('video_call_participants')
        .select('id')
        .eq('session_id', sessionId)
        .is('left_at', null);
      
      if (participants) {
        participantCount = participants.length;
      }
    }
    
    // Send system message with call log
    await onSendMessage(
      `📹 Video call ended • Duration: ${durationText} • ${participantCount} participant${participantCount !== 1 ? 's' : ''}`,
      { 
        type: 'call_log',
        call_type: 'video',
        duration_seconds: durationSeconds,
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
          onSessionCreated={(sessionId) => sessionIdRef.current = sessionId}
        />
      )}
    </>
  );
}
