import { useState, useEffect } from "react";
import { VoiceChat, VoiceChatParticipant } from "@/components/ui/voice-chat";
import { useActiveCall } from "@/contexts/ActiveCallContext";
import { cn } from "@/lib/utils";

interface VoiceChatWidgetProps {
  className?: string;
  onJoinChannel?: (channelId: string) => void;
}

export function VoiceChatWidget({ className, onJoinChannel }: VoiceChatWidgetProps) {
  const { activeChannelId, voice, joinCall } = useActiveCall();
  const [isVisible, setIsVisible] = useState(false);
  const [mockParticipants, setMockParticipants] = useState<VoiceChatParticipant[]>([]);

  // Show widget if there are participants or user is connected
  useEffect(() => {
    // For now, show with mock data for demonstration
    // In production, this would come from voice.participants or a realtime subscription
    if (activeChannelId) {
      setIsVisible(true);
      // Convert voice participants to widget format
      const participants = voice.participants.map((p) => ({
        id: p.id,
        name: p.user?.full_name || "User",
        avatar: p.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.user_id}`,
        isSpeaking: p.is_speaking,
      }));
      setMockParticipants(participants);
    } else {
      // Show demo participants when not in a call
      setMockParticipants([
        { id: "1", name: "Sarah", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah", isSpeaking: true },
        { id: "2", name: "James", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=james" },
        { id: "3", name: "Maria", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=maria" },
        { id: "4", name: "Alex", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex", isSpeaking: true },
        { id: "5", name: "Emma", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=emma" },
      ]);
      setIsVisible(true);
    }
  }, [activeChannelId, voice.participants]);

  const handleJoin = () => {
    // If there's a channel to join, join it
    if (onJoinChannel) {
      // Use a default voice channel ID or the first available one
      onJoinChannel("default-voice-channel");
    }
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible || mockParticipants.length === 0) {
    return null;
  }

  return (
    <div className={cn("fixed z-50", className)}>
      <VoiceChat
        participants={mockParticipants}
        channelName={activeChannelId ? "Live Voice" : "Voice Lounge"}
        onJoin={handleJoin}
        onClose={handleClose}
        isConnected={!!activeChannelId}
      />
    </div>
  );
}
