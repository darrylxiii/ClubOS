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
  Circle,
  Subtitles,
  FileText,
  Info,
  PictureInPicture2
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
  onToggleCaptions?: () => void;
  onOpenNotes?: () => void;
  captionsEnabled?: boolean;
  onOpenHostSettings?: () => void;
  onOpenMeetingInfo?: () => void;
  onEnablePiP?: () => void;
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
  onToggleCaptions,
  onOpenNotes,
  captionsEnabled = false,
  onReaction,
  onOpenHostSettings,
  onOpenMeetingInfo,
  onEnablePiP
}: ControlsPanelProps) {
  const reactions = ['👍', '👏', '❤️', '😂', '🎉', '👋'];

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[10000]">
      <div className="backdrop-blur-2xl bg-black/40 border border-white/10 rounded-full px-6 py-4 shadow-2xl flex items-center gap-3">
        {/* Audio Control */}
        <Button
          size="lg"
          onClick={onToggleAudio}
          className={cn(
            "rounded-full h-14 w-14 transition-all duration-300 shadow-lg backdrop-blur-xl border border-white/10",
            isAudioEnabled
              ? "bg-card/10 hover:bg-card/20 text-white"
              : "bg-red-500/90 hover:bg-red-600 text-white shadow-red-500/50"
          )}
        >
          {isAudioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
        </Button>

        {/* Video Control */}
        <Button
          size="lg"
          onClick={onToggleVideo}
          className={cn(
            "rounded-full h-14 w-14 transition-all duration-300 shadow-lg backdrop-blur-xl border border-white/10",
            isVideoEnabled
              ? "bg-card/10 hover:bg-card/20 text-white"
              : "bg-red-500/90 hover:bg-red-600 text-white shadow-red-500/50"
          )}
        >
          {isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
        </Button>

        {/* Screen Share */}
        <Button
          size="lg"
          onClick={onToggleScreenShare}
          className={cn(
            "rounded-full h-14 w-14 transition-all duration-300 shadow-lg backdrop-blur-xl border border-white/10",
            isScreenSharing
              ? "bg-primary/90 text-white shadow-primary/50"
              : "bg-card/10 hover:bg-card/20 text-white"
          )}
        >
          {isScreenSharing ? <MonitorOff className="h-6 w-6" /> : <Monitor className="h-6 w-6" />}
        </Button>

        {/* Divider */}
        <div className="h-8 w-px bg-white/20" />

        {/* Reactions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="lg"
              className="rounded-full h-14 w-14 transition-all duration-300 shadow-lg backdrop-blur-xl border border-white/10 bg-card/10 hover:bg-card/20 text-white text-2xl"
            >
              😊
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="backdrop-blur-2xl bg-black/80 border border-white/20 shadow-2xl" sideOffset={10}>
            <div className="grid grid-cols-3 gap-2 p-2">
              {reactions.map(emoji => (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="lg"
                  onClick={() => onReaction(emoji)}
                  className="text-3xl hover:scale-125 transition-transform hover:bg-white/10"
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
            "rounded-full h-14 w-14 transition-all duration-300 shadow-lg backdrop-blur-xl border border-white/10",
            isHandRaised
              ? "bg-yellow-500/90 hover:bg-yellow-600 text-white animate-bounce shadow-yellow-500/50"
              : "bg-card/10 hover:bg-card/20 text-white"
          )}
        >
          <Hand className="h-6 w-6" />
        </Button>

        {/* Divider */}
        <div className="h-8 w-px bg-white/20" />

        {/* More Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="lg"
              className="rounded-full h-14 w-14 transition-all duration-300 shadow-lg backdrop-blur-xl border border-white/10 bg-card/10 hover:bg-card/20 text-white"
            >
              <MoreVertical className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="backdrop-blur-2xl bg-black/80 border border-white/20 shadow-2xl" align="end" sideOffset={10}>
            <DropdownMenuItem onClick={onToggleRecording} className="gap-2 text-white hover:bg-white/10">
              <Circle className={cn("h-4 w-4", isRecording && "fill-red-500 text-red-500 animate-pulse")} />
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenChat} className="gap-2 text-white hover:bg-white/10">
              <MessageSquare className="h-4 w-4" />
              Chat
            </DropdownMenuItem>
            {onToggleCaptions && (
              <DropdownMenuItem onClick={onToggleCaptions} className="gap-2 text-white hover:bg-white/10">
                <Subtitles className={cn("h-4 w-4", captionsEnabled && "text-primary")} />
                {captionsEnabled ? 'Hide Captions' : 'Show Captions'}
              </DropdownMenuItem>
            )}
            {onOpenNotes && (
              <DropdownMenuItem onClick={onOpenNotes} className="gap-2 text-white hover:bg-white/10">
                <FileText className="h-4 w-4" />
                Meeting Notes
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onOpenParticipants} className="gap-2 text-white hover:bg-white/10">
              <Users className="h-4 w-4" />
              Participants
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenSettings} className="gap-2 text-white hover:bg-white/10">
              <Settings className="h-4 w-4" />
              Settings
            </DropdownMenuItem>
            {onOpenHostSettings && (
              <DropdownMenuItem onClick={onOpenHostSettings} className="gap-2 text-white hover:bg-white/10">
                <Settings className="h-4 w-4" />
                Host Settings
              </DropdownMenuItem>
            )}
            {onOpenMeetingInfo && (
              <DropdownMenuItem onClick={onOpenMeetingInfo} className="gap-2 text-white hover:bg-white/10">
                <Info className="h-4 w-4" />
                Meeting Details
              </DropdownMenuItem>
            )}
            {onEnablePiP && (
              <DropdownMenuItem onClick={onEnablePiP} className="gap-2 text-white hover:bg-white/10">
                <PictureInPicture2 className="h-4 w-4" />
                Picture-in-Picture
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* End Call */}
        <Button
          size="lg"
          onClick={onEndCall}
          className="rounded-full h-14 w-14 bg-red-500/90 hover:bg-red-600 text-white ml-2 shadow-2xl shadow-red-500/50 border border-red-400/20 transition-all duration-300"
        >
          <PhoneOff className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}