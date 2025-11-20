import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  PictureInPicture2,
  BarChart3,
  MessageCircleQuestion,
  Image,
  Lock,
  ThumbsUp,
  Sparkles
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { meetingZIndex, meetingInteractions, meetingShadows, meetingBackdrop } from '@/config/meeting-design-tokens';

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
  onOpenInterviewIntelligence?: () => void;
  onOpenBreakoutRooms?: () => void;
  onOpenPolls?: () => void;
  onOpenQA?: () => void;
  onOpenBackgrounds?: () => void;
  onToggleBackchannel?: () => void;
  onToggleVoting?: () => void;
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
  onEnablePiP,
  onOpenInterviewIntelligence,
  onOpenBreakoutRooms,
  onOpenPolls,
  onOpenQA,
  onOpenBackgrounds,
  onToggleBackchannel,
  onToggleVoting,
}: ControlsPanelProps) {
  const reactions = ['👍', '👏', '❤️', '😂', '🎉', '👋'];

  const ControlButton = ({ 
    children, 
    onClick, 
    isActive, 
    isDangerous, 
    tooltip, 
    badge 
  }: { 
    children: React.ReactNode; 
    onClick: () => void; 
    isActive?: boolean; 
    isDangerous?: boolean;
    tooltip?: string;
    badge?: number;
  }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            <Button
              size="lg"
              onClick={onClick}
              className={cn(
                "rounded-full h-16 w-16 transition-all duration-300 shadow-xl backdrop-blur-xl border border-white/10",
                meetingInteractions.hoverScale,
                isActive && !isDangerous && "bg-white/10 hover:bg-white/20 text-white",
                !isActive && !isDangerous && "bg-white/10 hover:bg-white/20 text-white",
                isDangerous && isActive && "bg-rose-500/90 hover:bg-rose-600 text-white shadow-[0_0_32px_rgba(244,63,94,0.6)]",
              )}
            >
              {children}
            </Button>
            {badge !== undefined && badge > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-6 min-w-6 flex items-center justify-center px-1.5 bg-rose-500 text-white text-xs font-bold rounded-full shadow-lg animate-pulse"
              >
                {badge > 9 ? '9+' : badge}
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        {tooltip && (
          <TooltipContent 
            side="top" 
            className={cn(
              meetingBackdrop.dark,
              "border-white/20 text-white"
            )}
            sideOffset={12}
          >
            <p>{tooltip}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div 
      className="fixed bottom-8 left-1/2 -translate-x-1/2 animate-in slide-in-from-bottom duration-500"
      style={{ zIndex: meetingZIndex.controls }}
    >
      <div className={cn(
        meetingBackdrop.medium,
        "border border-white/10 rounded-full px-8 py-4",
        "shadow-[0_16px_64px_rgba(0,0,0,0.5)]",
        "flex items-center gap-3"
      )}>
        {/* Core Controls - Always Visible */}
        
        {/* Audio Control */}
        <ControlButton
          onClick={onToggleAudio}
          isActive={!isAudioEnabled}
          isDangerous={!isAudioEnabled}
          tooltip={isAudioEnabled ? "Mute (⌘D)" : "Unmute (⌘D)"}
        >
          {isAudioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
        </ControlButton>

        {/* Video Control */}
        <ControlButton
          onClick={onToggleVideo}
          isActive={!isVideoEnabled}
          isDangerous={!isVideoEnabled}
          tooltip={isVideoEnabled ? "Stop Video (⌘E)" : "Start Video (⌘E)"}
        >
          {isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
        </ControlButton>

        {/* Screen Share */}
        <ControlButton
          onClick={onToggleScreenShare}
          isActive={isScreenSharing}
          tooltip={isScreenSharing ? "Stop Sharing" : "Share Screen"}
        >
          {isScreenSharing ? <MonitorOff className="h-6 w-6" /> : <Monitor className="h-6 w-6" />}
        </ControlButton>

        {/* Divider */}
        <div className="h-10 w-px bg-white/20" />

        {/* Chat - Promoted to main controls */}
        <ControlButton
          onClick={onOpenChat}
          tooltip="Chat (⌘⇧C)"
        >
          <MessageSquare className="h-6 w-6" />
        </ControlButton>

        {/* Participants - Promoted to main controls */}
        <ControlButton
          onClick={onOpenParticipants}
          tooltip="Participants (⌘⇧P)"
        >
          <Users className="h-6 w-6" />
        </ControlButton>

        {/* Divider */}
        <div className="h-10 w-px bg-white/20" />

        {/* Reactions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div>
              <ControlButton
                onClick={() => {}}
                tooltip="Send Reaction"
              >
                <span className="text-2xl">😊</span>
              </ControlButton>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            className={cn(
              meetingBackdrop.dark,
              "border border-white/20",
              "shadow-[0_12px_48px_rgba(0,0,0,0.4)]"
            )}
            style={{ zIndex: meetingZIndex.dropdown }}
            sideOffset={20}
            align="center"
          >
            <div className="grid grid-cols-3 gap-2 p-3">
              {reactions.map(emoji => (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="lg"
                  onClick={() => onReaction(emoji)}
                  className="text-3xl hover:scale-125 transition-all duration-200 hover:bg-white/10 rounded-xl"
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Hand Raise */}
        <ControlButton
          onClick={onToggleHandRaise}
          isActive={isHandRaised}
          tooltip={isHandRaised ? "Lower Hand" : "Raise Hand (⌘⇧H)"}
        >
          <Hand className={cn("h-6 w-6", isHandRaised && "animate-bounce")} />
        </ControlButton>

        {/* Divider */}
        <div className="h-10 w-px bg-white/20" />

        {/* More Options - Organized Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div>
              <ControlButton
                onClick={() => {}}
                tooltip="More Options"
              >
                <MoreVertical className="h-6 w-6" />
              </ControlButton>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            className={cn(
              meetingBackdrop.dark,
              "border border-white/20",
              "shadow-[0_12px_48px_rgba(0,0,0,0.4)]",
              "min-w-[280px]"
            )}
            style={{ zIndex: meetingZIndex.dropdown }}
            align="end" 
            sideOffset={20}
          >
            {/* Meeting Actions */}
            <DropdownMenuLabel className="text-white/60 text-xs uppercase tracking-wider px-2 py-1.5">
              Meeting Actions
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={onToggleRecording} className="gap-3 text-white hover:bg-white/10 py-3 cursor-pointer">
              <Circle className={cn("h-4 w-4", isRecording && "fill-red-500 text-red-500 animate-pulse")} />
              <span>{isRecording ? 'Stop Recording' : 'Start Recording'}</span>
              {isRecording && <Badge className="ml-auto bg-red-500 text-white text-[10px]">REC</Badge>}
            </DropdownMenuItem>
            {onToggleCaptions && (
              <DropdownMenuItem onClick={onToggleCaptions} className="gap-3 text-white hover:bg-white/10 py-3 cursor-pointer">
                <Subtitles className={cn("h-4 w-4", captionsEnabled && "text-primary")} />
                <span>{captionsEnabled ? 'Hide Captions' : 'Show Captions'}</span>
              </DropdownMenuItem>
            )}
            {onOpenNotes && (
              <DropdownMenuItem onClick={onOpenNotes} className="gap-3 text-white hover:bg-white/10 py-3 cursor-pointer">
                <FileText className="h-4 w-4" />
                <span>Meeting Notes</span>
              </DropdownMenuItem>
            )}
            {onOpenMeetingInfo && (
              <DropdownMenuItem onClick={onOpenMeetingInfo} className="gap-3 text-white hover:bg-white/10 py-3 cursor-pointer">
                <Info className="h-4 w-4" />
                <span>Meeting Details</span>
              </DropdownMenuItem>
            )}

            {/* Interview Tools - Only show if interview functions exist */}
            {(onToggleBackchannel || onToggleVoting || onOpenInterviewIntelligence) && (
              <>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuLabel className="text-white/60 text-xs uppercase tracking-wider px-2 py-1.5 flex items-center gap-2">
                  <Sparkles className="h-3 w-3 text-amber-400" />
                  Interview Tools
                </DropdownMenuLabel>
                {onToggleBackchannel && (
                  <DropdownMenuItem onClick={onToggleBackchannel} className="gap-3 text-white hover:bg-white/10 py-3 cursor-pointer">
                    <Lock className="h-4 w-4 text-amber-500" />
                    <span>Interviewer Notes</span>
                    <Badge className="ml-auto bg-amber-500/20 text-amber-300 text-[10px]">🔒</Badge>
                  </DropdownMenuItem>
                )}
                {onToggleVoting && (
                  <DropdownMenuItem onClick={onToggleVoting} className="gap-3 text-white hover:bg-white/10 py-3 cursor-pointer">
                    <ThumbsUp className="h-4 w-4" />
                    <span>Vote on Candidate</span>
                  </DropdownMenuItem>
                )}
                {onOpenInterviewIntelligence && (
                  <DropdownMenuItem onClick={onOpenInterviewIntelligence} className="gap-3 text-white hover:bg-white/10 py-3 cursor-pointer">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>AI Intelligence</span>
                    <Badge className="ml-auto bg-primary/20 text-primary text-[10px]">AI</Badge>
                  </DropdownMenuItem>
                )}
              </>
            )}

            {/* Settings */}
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuLabel className="text-white/60 text-xs uppercase tracking-wider px-2 py-1.5">
              Settings
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={onOpenSettings} className="gap-3 text-white hover:bg-white/10 py-3 cursor-pointer">
              <Settings className="h-4 w-4" />
              <span>Audio & Video</span>
            </DropdownMenuItem>
            {onOpenBackgrounds && (
              <DropdownMenuItem onClick={onOpenBackgrounds} className="gap-3 text-white hover:bg-white/10 py-3 cursor-pointer">
                <Image className="h-4 w-4" />
                <span>Virtual Backgrounds</span>
              </DropdownMenuItem>
            )}
            {onEnablePiP && (
              <DropdownMenuItem onClick={onEnablePiP} className="gap-3 text-white hover:bg-white/10 py-3 cursor-pointer">
                <PictureInPicture2 className="h-4 w-4" />
                <span>Picture-in-Picture</span>
              </DropdownMenuItem>
            )}
            {onOpenHostSettings && (
              <DropdownMenuItem onClick={onOpenHostSettings} className="gap-3 text-white hover:bg-white/10 py-3 cursor-pointer">
                <Settings className="h-4 w-4" />
                <span>Host Settings</span>
              </DropdownMenuItem>
            )}

            {/* Advanced (hidden/less common features) */}
            {(onOpenBreakoutRooms || onOpenPolls || onOpenQA) && (
              <>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuLabel className="text-white/60 text-xs uppercase tracking-wider px-2 py-1.5">
                  Advanced
                </DropdownMenuLabel>
                {onOpenBreakoutRooms && (
                  <DropdownMenuItem onClick={onOpenBreakoutRooms} className="gap-3 text-white hover:bg-white/10 py-3 cursor-pointer">
                    <Users className="h-4 w-4" />
                    <span>Breakout Rooms</span>
                  </DropdownMenuItem>
                )}
                {onOpenPolls && (
                  <DropdownMenuItem onClick={onOpenPolls} className="gap-3 text-white hover:bg-white/10 py-3 cursor-pointer">
                    <BarChart3 className="h-4 w-4" />
                    <span>Live Polls</span>
                  </DropdownMenuItem>
                )}
                {onOpenQA && (
                  <DropdownMenuItem onClick={onOpenQA} className="gap-3 text-white hover:bg-white/10 py-3 cursor-pointer">
                    <MessageCircleQuestion className="h-4 w-4" />
                    <span>Q&A</span>
                  </DropdownMenuItem>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* End Call */}
        <div className="ml-2">
          <ControlButton
            onClick={onEndCall}
            isDangerous
            isActive
            tooltip="End Call"
          >
            <PhoneOff className="h-6 w-6" />
          </ControlButton>
        </div>
      </div>
    </div>
  );
}