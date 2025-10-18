import { Button } from '@/components/ui/button';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  Hand,
  MessageSquare,
  Users,
  Settings,
  MoreVertical,
  Circle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ControlsPanelProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isRecording: boolean;
  isHandRaised: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleRecording: () => void;
  onToggleHandRaise: () => void;
  onEndCall: () => void;
  onOpenChat: () => void;
  onOpenParticipants: () => void;
  onOpenSettings: () => void;
  onReaction: (emoji: string) => void;
}

export function ControlsPanel({
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  isRecording,
  isHandRaised,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleRecording,
  onToggleHandRaise,
  onEndCall,
  onOpenChat,
  onOpenParticipants,
  onOpenSettings,
  onReaction
}: ControlsPanelProps) {
  const reactions = ['👍', '👏', '❤️', '😂', '🎉', '👋'];

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[10000]">
      <div className="glass-card rounded-full px-6 py-4 shadow-glass-lg flex items-center gap-3">
        {/* Audio Control */}
        <Button
          size="lg"
          onClick={onToggleAudio}
          className={cn(
            "rounded-full h-14 w-14 transition-all duration-200",
            isAudioEnabled
              ? "bg-background/50 hover:bg-background/70"
              : "bg-red-500 hover:bg-red-600 text-white"
          )}
        >
          {isAudioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
        </Button>

        {/* Video Control */}
        <Button
          size="lg"
          onClick={onToggleVideo}
          className={cn(
            "rounded-full h-14 w-14 transition-all duration-200",
            isVideoEnabled
              ? "bg-background/50 hover:bg-background/70"
              : "bg-red-500 hover:bg-red-600 text-white"
          )}
        >
          {isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
        </Button>

        {/* Screen Share */}
        <Button
          size="lg"
          onClick={onToggleScreenShare}
          className={cn(
            "rounded-full h-14 w-14 transition-all duration-200",
            isScreenSharing
              ? "bg-primary text-white"
              : "bg-background/50 hover:bg-background/70"
          )}
        >
          {isScreenSharing ? <MonitorOff className="h-6 w-6" /> : <Monitor className="h-6 w-6" />}
        </Button>

        {/* Divider */}
        <div className="h-8 w-px bg-border/50" />

        {/* Reactions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="lg"
              className="rounded-full h-14 w-14 bg-background/50 hover:bg-background/70"
            >
              😊
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="glass-card">
            <div className="grid grid-cols-3 gap-2 p-2">
              {reactions.map(emoji => (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="lg"
                  onClick={() => onReaction(emoji)}
                  className="text-2xl hover:scale-125 transition-transform"
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Hand Raise */}
        <Button
          size="lg"
          onClick={onToggleHandRaise}
          className={cn(
            "rounded-full h-14 w-14 transition-all duration-200",
            isHandRaised
              ? "bg-yellow-500 hover:bg-yellow-600 text-white animate-bounce"
              : "bg-background/50 hover:bg-background/70"
          )}
        >
          <Hand className="h-6 w-6" />
        </Button>

        {/* Divider */}
        <div className="h-8 w-px bg-border/50" />

        {/* More Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="lg"
              className="rounded-full h-14 w-14 bg-background/50 hover:bg-background/70"
            >
              <MoreVertical className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="glass-card" align="end">
            <DropdownMenuItem onClick={onToggleRecording} className="gap-2">
              <Circle className={cn("h-4 w-4", isRecording && "fill-red-500 text-red-500 animate-pulse")} />
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenChat} className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenParticipants} className="gap-2">
              <Users className="h-4 w-4" />
              Participants
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenSettings} className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* End Call */}
        <Button
          size="lg"
          onClick={onEndCall}
          className="rounded-full h-14 w-14 bg-red-500 hover:bg-red-600 text-white ml-2"
        >
          <PhoneOff className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}