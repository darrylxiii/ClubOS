import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  MonitorOff,
  Hand,
  MoreVertical,
  Settings,
  Users,
  MessageSquare,
  Activity,
  Subtitles,
  Circle,
  PhoneOff,
  Grid,
  Layout,
  Sidebar,
  Sparkles,
  Wand2
} from 'lucide-react';
import { useMasterMeeting } from '@/hooks/useMasterMeeting';
import { cn } from '@/lib/utils';

interface UnifiedMeetingControlsProps {
  channelId: string;
  userId: string;
  userName: string;
  onOpenChat?: () => void;
  onOpenParticipants?: () => void;
  onOpenSettings?: () => void;
  onOpenPerformance?: () => void;
  className?: string;
  // External control overrides (for P2P engine)
  onToggleMute?: () => void;
  onToggleVideo?: () => void;
  onToggleScreenShare?: () => void;
  onToggleRecording?: () => void;
  onToggleHandRaise?: () => void;
  onLeave?: () => void;
  isMuted?: boolean;
  isVideoOn?: boolean;
  isScreenSharing?: boolean;
  isRecording?: boolean;
  handRaised?: boolean;
}

export function UnifiedMeetingControls({
  channelId,
  userId,
  userName,
  onOpenChat,
  onOpenParticipants,
  onOpenSettings,
  onOpenPerformance,
  className,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleRecording,
  onToggleHandRaise,
  onLeave,
  isMuted: externalIsMuted,
  isVideoOn: externalIsVideoOn,
  isScreenSharing: externalIsScreenSharing,
  isRecording: externalIsRecording,
  handRaised: externalHandRaised
}: UnifiedMeetingControlsProps) {
  // Determine if we are in "controlled" mode (dumb UI)
  const isControlled = !!onToggleMute;

  const meeting = useMasterMeeting({
    channelId,
    userId,
    userName,
    autoJoin: !isControlled, // Disable auto-join if controlled
    enablePerformanceMonitoring: true,
    enableStatePreservation: true
  });

  const [showEffects, setShowEffects] = useState(false);

  const localParticipant = meeting.meetingState.participants.find(
    p => p.id === meeting.meetingState.localParticipantId
  );

  const isMuted = isControlled ? (externalIsMuted ?? true) : (localParticipant?.isMuted ?? true);
  const isVideoOn = isControlled ? (externalIsVideoOn ?? false) : (localParticipant?.isVideoOn ?? false);
  const isScreenSharing = isControlled ? (externalIsScreenSharing ?? false) : (localParticipant?.isScreenSharing ?? false);
  const handRaised = isControlled ? (externalHandRaised ?? false) : (localParticipant?.handRaised ?? false);
  const isRecording = isControlled ? (externalIsRecording ?? false) : meeting.meetingState.isRecording;

  const getLayoutIcon = () => {
    switch (meeting.meetingState.layout) {
      case 'grid':
        return <Grid className="h-4 w-4" />;
      case 'speaker':
        return <Layout className="h-4 w-4" />;
      case 'sidebar':
        return <Sidebar className="h-4 w-4" />;
      default:
        return <Grid className="h-4 w-4" />;
    }
  };

  return (
    <TooltipProvider>
      <div className={cn(
        "flex items-center justify-center gap-2 p-3 bg-background/80 backdrop-blur-md border-t border-border/50",
        className
      )}>
        {/* Audio Control */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isMuted ? "secondary" : "secondary"}
              size="icon"
              className="h-12 w-12 rounded-full"

              onClick={onToggleMute || meeting.toggleMute}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isMuted ? 'Unmute' : 'Mute'}
          </TooltipContent>
        </Tooltip>

        {/* Video Control */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isVideoOn ? "secondary" : "outline"}
              size="icon"
              className="h-12 w-12 rounded-full"

              onClick={onToggleVideo || meeting.toggleVideo}
            >
              {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isVideoOn ? 'Turn off camera' : 'Turn on camera'}
          </TooltipContent>
        </Tooltip>

        {/* Screen Share */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isScreenSharing ? "default" : "outline"}
              size="icon"
              className="h-12 w-12 rounded-full"

              onClick={onToggleScreenShare || meeting.toggleScreenShare}
            >
              {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <MonitorUp className="h-5 w-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isScreenSharing ? 'Stop sharing' : 'Share screen'}
          </TooltipContent>
        </Tooltip>

        {/* Effects */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showEffects ? "default" : "outline"}
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={() => setShowEffects(!showEffects)}
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Effects</TooltipContent>
        </Tooltip>

        {/* Raise Hand */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={handRaised ? "default" : "outline"}
              size="icon"
              className={cn(
                "h-10 w-10 rounded-full",
                handRaised && "bg-yellow-500 hover:bg-yellow-600"
              )}

              onClick={onToggleHandRaise || meeting.toggleHandRaise}
            >
              <Hand className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {handRaised ? 'Lower hand' : 'Raise hand'}
          </TooltipContent>
        </Tooltip>

        {/* Layout Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-full">
              {getLayoutIcon()}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            <DropdownMenuItem onClick={() => meeting.setLayout('grid')}>
              <Grid className="h-4 w-4 mr-2" />
              Grid View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => meeting.setLayout('speaker')}>
              <Layout className="h-4 w-4 mr-2" />
              Speaker View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => meeting.setLayout('sidebar')}>
              <Sidebar className="h-4 w-4 mr-2" />
              Sidebar View
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Separator */}
        <div className="w-px h-8 bg-border/50 mx-2" />

        {/* Participants */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full relative"
              onClick={onOpenParticipants}
            >
              <Users className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                {meeting.meetingState.participants.length}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Participants</TooltipContent>
        </Tooltip>

        {/* Chat */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={onOpenChat}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Chat</TooltipContent>
        </Tooltip>

        {/* Transcription */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={meeting.meetingState.isTranscribing ? "default" : "ghost"}
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={meeting.toggleTranscription}
            >
              <Subtitles className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {meeting.meetingState.isTranscribing ? 'Stop transcription' : 'Start transcription'}
          </TooltipContent>
        </Tooltip>

        {/* Recording */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={onToggleRecording || meeting.toggleRecording}
            >
              <Circle className={cn(
                "h-4 w-4",
                isRecording && "fill-current animate-pulse"
              )} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {meeting.meetingState.isRecording ? 'Stop recording' : 'Start recording'}
          </TooltipContent>
        </Tooltip>

        {/* More Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onOpenPerformance}>
              <Activity className="h-4 w-4 mr-2" />
              Performance
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenSettings}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Wand2 className="h-4 w-4 mr-2" />
              AI Features
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-muted-foreground text-xs">
              Quality: {meeting.qualityRecovery.currentQuality}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-muted-foreground text-xs">
              Score: {meeting.performance.performanceScore}/100
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Separator */}
        <div className="w-px h-8 bg-border/50 mx-2" />

        {/* Leave */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="h-12 w-12 rounded-full"

              onClick={onLeave || meeting.leaveMeeting}
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Leave meeting</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider >
  );
}
