import { useState, useEffect } from "react";
import { VoiceChat, VoiceChatParticipant } from "@/components/ui/voice-chat";
import { useActiveCall } from "@/contexts/ActiveCallContext";
import { cn } from "@/lib/utils";

interface VoiceChatWidgetProps {
  className?: string;
  onJoinChannel?: (channelId: string) => void;
  /** Enable demo mode to show mock participants when not connected */
  demoMode?: boolean;
}

export function VoiceChatWidget({ className, onJoinChannel, demoMode = false }: VoiceChatWidgetProps) {
  const { activeChannelId, voice, joinCall } = useActiveCall();
  const [isVisible, setIsVisible] = useState(false);
  const [participants, setParticipants] = useState<VoiceChatParticipant[]>([]);

  // Show widget only when connected to a channel (or in demo mode)
  useEffect(() => {
    if (activeChannelId) {
      // User is connected - show real participants
      setIsVisible(true);
      const realParticipants = voice.participants.map((p) => ({
        id: p.id,
        name: p.user?.full_name || "User",
        avatar: p.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.user_id}`,
        isSpeaking: p.is_speaking,
      }));
      setParticipants(realParticipants);
    } else if (demoMode) {
      // Demo mode enabled - show mock participants
      setParticipants([
        { id: "1", name: "Sarah", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah", isSpeaking: true },
        { id: "2", name: "James", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=james" },
        { id: "3", name: "Maria", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=maria" },
        { id: "4", name: "Alex", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex", isSpeaking: true },
        { id: "5", name: "Emma", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=emma" },
      ]);
      setIsVisible(true);
    } else {
      // Not connected and not in demo mode - hide widget
      setIsVisible(false);
      setParticipants([]);
    }
  }, [activeChannelId, voice.participants, demoMode]);

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

  if (!isVisible || participants.length === 0) {
    return null;
  }

  return (
    <div className={cn("fixed z-50", className)}>
      <VoiceChat
        participants={participants}
        channelName={activeChannelId ? "Live Voice" : "Voice Lounge"}
        onJoin={handleJoin}
        onClose={handleClose}
        isConnected={!!activeChannelId}
      />
    </div>
  );
}
