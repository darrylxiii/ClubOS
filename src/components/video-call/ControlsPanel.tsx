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
  Sparkles,
  LayoutGrid
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
import { motion } from 'framer-motion';

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
  onOpenTranscription?: () => void;
  transcriptionEnabled?: boolean;
  isTranscribing?: boolean;
  layout?: 'grid' | 'spotlight';
  onToggleLayout?: () => void;
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
  onOpenTranscription,
  transcriptionEnabled = false,
  isTranscribing = false,
  layout = 'grid',
  onToggleLayout,
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
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="relative"
          >
            <Button
              size="lg"
              onClick={onClick}
              className={cn(
                "rounded-full h-14 w-14 sm:h-16 sm:w-16 transition-all duration-300 shadow-xl backdrop-blur-xl border border-white/10",
                isActive && !isDangerous && "bg-white/10 hover:bg-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.2)]",
                !isActive && !isDangerous && "bg-black/40 hover:bg-white/10 text-white/90",
                isDangerous && isActive && "bg-rose-600 hover:bg-rose-700 text-white shadow-[0_0_20px_rgba(225,29,72,0.6)]",
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
          </motion.div>
        </TooltipTrigger>
        {tooltip && (
          <TooltipContent
            side="top"
            className={cn(
              "bg-black/90 backdrop-blur-xl border-white/10 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
            )}
            sideOffset={16}
          >
            <p>{tooltip}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2"
      style={{ zIndex: meetingZIndex.controls }}
    >
      <div
        className={cn(
          "bg-black/60 backdrop-blur-2xl",
          "border border-white/10 rounded-full px-4 sm:px-8 py-3 sm:py-4",
          "flex items-center gap-2 sm:gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/5"
        )}
      >
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
        <div className="h-8 sm:h-10 w-px bg-white/10 mx-1" />

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
        <div className="h-8 sm:h-10 w-px bg-white/10 mx-1" />

        {/* Reactions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div>
              <ControlButton
                onClick={() => { }}
                tooltip="Send Reaction"
              >
                <span className="text-2xl pt-1">😊</span>
              </ControlButton>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className={cn(
              "bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-2",
            )}
            style={{ zIndex: meetingZIndex.dropdown, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}
            sideOffset={24}
            align="center"
          >
            <div className="grid grid-cols-3 gap-2">
              {reactions.map(emoji => (
                <motion.button
                  key={emoji}
                  whileHover={{ scale: 1.2, backgroundColor: 'rgba(255,255,255,0.1)' }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onReaction(emoji)}
                  className="text-3xl p-3 rounded-xl transition-colors"
                >
                  {emoji}
                </motion.button>
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
        <div className="h-8 sm:h-10 w-px bg-white/10 mx-1" />

        {/* More Options - Organized Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div>
              <ControlButton
                onClick={() => { }}
                tooltip="More Options"
              >
                <MoreVertical className="h-6 w-6" />
              </ControlButton>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className={cn(
              "bg-gray-950/95 backdrop-blur-2xl border border-white/10 rounded-xl",
              "min-w-[280px] p-2"
            )}
            style={{ zIndex: meetingZIndex.dropdown, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}
            align="end"
            sideOffset={24}
          >
            {/* Meeting Actions */}
            <DropdownMenuLabel className="text-white/40 text-[10px] uppercase tracking-widest px-3 py-2 font-semibold">
              Meeting Actions
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={onToggleRecording} className="gap-3 text-white/90 focus:bg-white/10 focus:text-white py-3 px-3 rounded-lg cursor-pointer transition-colors">
              <Circle className={cn("h-4 w-4", isRecording && "fill-rose-500 text-rose-500 animate-pulse")} />
              <span>{isRecording ? 'Stop Recording' : 'Start Recording'}</span>
              {isRecording && <Badge className="ml-auto bg-rose-600 text-white text-[10px]">REC</Badge>}
            </DropdownMenuItem>

            {onToggleCaptions && (
              <DropdownMenuItem onClick={onToggleCaptions} className="gap-3 text-white/90 focus:bg-white/10 focus:text-white py-3 px-3 rounded-lg cursor-pointer transition-colors">
                <Subtitles className={cn("h-4 w-4", captionsEnabled && "text-primary")} />
                <span>{captionsEnabled ? 'Hide Captions' : 'Show Captions'}</span>
              </DropdownMenuItem>
            )}
            {onOpenTranscription && (
              <DropdownMenuItem onClick={onOpenTranscription} className="gap-3 text-white/90 focus:bg-white/10 focus:text-white py-3 px-3 rounded-lg cursor-pointer transition-colors">
                <FileText className={cn("h-4 w-4", transcriptionEnabled && "text-primary")} />
                <span>Transcription</span>
                {isTranscribing && <Badge className="ml-auto bg-green-500 text-white text-[10px] animate-pulse">LIVE</Badge>}
              </DropdownMenuItem>
            )}
            {onOpenNotes && (
              <DropdownMenuItem onClick={onOpenNotes} className="gap-3 text-white/90 focus:bg-white/10 focus:text-white py-3 px-3 rounded-lg cursor-pointer transition-colors">
                <FileText className="h-4 w-4" />
                <span>Meeting Notes</span>
              </DropdownMenuItem>
            )}
            {onOpenMeetingInfo && (
              <DropdownMenuItem onClick={onOpenMeetingInfo} className="gap-3 text-white/90 focus:bg-white/10 focus:text-white py-3 px-3 rounded-lg cursor-pointer transition-colors">
                <Info className="h-4 w-4" />
                <span>Meeting Details</span>
              </DropdownMenuItem>
            )}

            {/* Interview Tools - Only show if interview functions exist */}
            {(onToggleBackchannel || onToggleVoting || onOpenInterviewIntelligence) && (
              <>
                <DropdownMenuSeparator className="bg-white/10 my-2" />
                <DropdownMenuLabel className="text-white/40 text-[10px] uppercase tracking-widest px-3 py-2 font-semibold flex items-center gap-2">
                  <Sparkles className="h-3 w-3 text-amber-400" />
                  Interview Tools
                </DropdownMenuLabel>
                {onToggleBackchannel && (
                  <DropdownMenuItem onClick={onToggleBackchannel} className="gap-3 text-white/90 focus:bg-white/10 focus:text-white py-3 px-3 rounded-lg cursor-pointer transition-colors">
                    <Lock className="h-4 w-4 text-amber-500" />
                    <span>Interviewer Notes</span>
                    <Badge className="ml-auto bg-amber-500/20 text-amber-300 text-[10px]">🔒</Badge>
                  </DropdownMenuItem>
                )}
                {onToggleVoting && (
                  <DropdownMenuItem onClick={onToggleVoting} className="gap-3 text-white/90 focus:bg-white/10 focus:text-white py-3 px-3 rounded-lg cursor-pointer transition-colors">
                    <ThumbsUp className="h-4 w-4" />
                    <span>Vote on Candidate</span>
                  </DropdownMenuItem>
                )}
                {onOpenInterviewIntelligence && (
                  <DropdownMenuItem onClick={onOpenInterviewIntelligence} className="gap-3 text-white/90 focus:bg-white/10 focus:text-white py-3 px-3 rounded-lg cursor-pointer transition-colors">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>AI Intelligence</span>
                    <Badge className="ml-auto bg-primary/20 text-primary text-[10px]">AI</Badge>
                  </DropdownMenuItem>
                )}
              </>
            )}

            {/* Settings */}
            <DropdownMenuSeparator className="bg-white/10 my-2" />
            <DropdownMenuLabel className="text-white/40 text-[10px] uppercase tracking-widest px-3 py-2 font-semibold">
              Settings
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={onOpenSettings} className="gap-3 text-white/90 focus:bg-white/10 focus:text-white py-3 px-3 rounded-lg cursor-pointer transition-colors">
              <Settings className="h-4 w-4" />
              <span>Audio & Video</span>
            </DropdownMenuItem>
            {onOpenBackgrounds && (
              <DropdownMenuItem onClick={onOpenBackgrounds} className="gap-3 text-white/90 focus:bg-white/10 focus:text-white py-3 px-3 rounded-lg cursor-pointer transition-colors">
                <Image className="h-4 w-4" />
                <span>Virtual Backgrounds</span>
              </DropdownMenuItem>
            )}
            {onEnablePiP && (
              <DropdownMenuItem onClick={onEnablePiP} className="gap-3 text-white/90 focus:bg-white/10 focus:text-white py-3 px-3 rounded-lg cursor-pointer transition-colors">
                <PictureInPicture2 className="h-4 w-4" />
                <span>Picture-in-Picture</span>
              </DropdownMenuItem>
            )}
            {onOpenHostSettings && (
              <DropdownMenuItem onClick={onOpenHostSettings} className="gap-3 text-white/90 focus:bg-white/10 focus:text-white py-3 px-3 rounded-lg cursor-pointer transition-colors">
                <Settings className="h-4 w-4" />
                <span>Host Settings</span>
              </DropdownMenuItem>
            )}

            {/* View Layout */}
            {onToggleLayout && (
              <>
                <DropdownMenuSeparator className="bg-white/10 my-2" />
                <DropdownMenuLabel className="text-white/40 text-[10px] uppercase tracking-widest px-3 py-2 font-semibold">
                  View
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={onToggleLayout} className="gap-3 text-white/90 focus:bg-white/10 focus:text-white py-3 px-3 rounded-lg cursor-pointer transition-colors">
                  {layout === 'grid' ? (
                    <LayoutGrid className="h-4 w-4" />
                  ) : (
                    <Users className="h-4 w-4" />
                  )}
                  <span>{layout === 'grid' ? 'Speaker View' : 'Grid View'}</span>
                </DropdownMenuItem>
              </>
            )}

            {/* Advanced (hidden/less common features) */}
            {(onOpenBreakoutRooms || onOpenPolls || onOpenQA) && (
              <>
                <DropdownMenuSeparator className="bg-white/10 my-2" />
                <DropdownMenuLabel className="text-white/40 text-[10px] uppercase tracking-widest px-3 py-2 font-semibold">
                  Advanced
                </DropdownMenuLabel>
                {onOpenBreakoutRooms && (
                  <DropdownMenuItem onClick={onOpenBreakoutRooms} className="gap-3 text-white/90 focus:bg-white/10 focus:text-white py-3 px-3 rounded-lg cursor-pointer transition-colors">
                    <Users className="h-4 w-4" />
                    <span>Breakout Rooms</span>
                  </DropdownMenuItem>
                )}
                {onOpenPolls && (
                  <DropdownMenuItem onClick={onOpenPolls} className="gap-3 text-white/90 focus:bg-white/10 focus:text-white py-3 px-3 rounded-lg cursor-pointer transition-colors">
                    <BarChart3 className="h-4 w-4" />
                    <span>Live Polls</span>
                  </DropdownMenuItem>
                )}
                {onOpenQA && (
                  <DropdownMenuItem onClick={onOpenQA} className="gap-3 text-white/90 focus:bg-white/10 focus:text-white py-3 px-3 rounded-lg cursor-pointer transition-colors">
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
    </motion.div>
  );
}