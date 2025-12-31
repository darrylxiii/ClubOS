import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  MessageSquare, 
  Users, 
  MoreHorizontal,
  Hand,
  MonitorUp,
  Settings,
  FileText,
  Subtitles,
  Palette
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileMeetingControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isHandRaised: boolean;
  isScreenSharing: boolean;
  captionsEnabled: boolean;
  unreadMessages?: number;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleHand: () => void;
  onToggleScreenShare: () => void;
  onToggleCaptions: () => void;
  onOpenChat: () => void;
  onOpenParticipants: () => void;
  onOpenSettings: () => void;
  onOpenNotes: () => void;
  onOpenBackgrounds: () => void;
  onEndCall: () => void;
}

export function MobileMeetingControls({
  isAudioEnabled,
  isVideoEnabled,
  isHandRaised,
  isScreenSharing,
  captionsEnabled,
  unreadMessages = 0,
  onToggleAudio,
  onToggleVideo,
  onToggleHand,
  onToggleScreenShare,
  onToggleCaptions,
  onOpenChat,
  onOpenParticipants,
  onOpenSettings,
  onOpenNotes,
  onOpenBackgrounds,
  onEndCall
}: MobileMeetingControlsProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  const primaryActions = [
    {
      icon: isAudioEnabled ? Mic : MicOff,
      label: isAudioEnabled ? 'Mute' : 'Unmute',
      onClick: onToggleAudio,
      active: isAudioEnabled,
      danger: false
    },
    {
      icon: isVideoEnabled ? Video : VideoOff,
      label: isVideoEnabled ? 'Stop Video' : 'Start Video',
      onClick: onToggleVideo,
      active: isVideoEnabled,
      danger: false
    },
    {
      icon: MessageSquare,
      label: 'Chat',
      onClick: onOpenChat,
      active: false,
      danger: false,
      badge: unreadMessages > 0 ? unreadMessages : undefined
    },
    {
      icon: Users,
      label: 'People',
      onClick: onOpenParticipants,
      active: false,
      danger: false
    },
    {
      icon: PhoneOff,
      label: 'Leave',
      onClick: onEndCall,
      active: false,
      danger: true
    }
  ];

  const moreActions = [
    {
      icon: Hand,
      label: isHandRaised ? 'Lower Hand' : 'Raise Hand',
      onClick: () => { onToggleHand(); setMoreOpen(false); },
      active: isHandRaised
    },
    {
      icon: MonitorUp,
      label: isScreenSharing ? 'Stop Share' : 'Share Screen',
      onClick: () => { onToggleScreenShare(); setMoreOpen(false); },
      active: isScreenSharing
    },
    {
      icon: Subtitles,
      label: captionsEnabled ? 'Hide Captions' : 'Show Captions',
      onClick: () => { onToggleCaptions(); setMoreOpen(false); },
      active: captionsEnabled
    },
    {
      icon: FileText,
      label: 'Notes',
      onClick: () => { onOpenNotes(); setMoreOpen(false); }
    },
    {
      icon: Palette,
      label: 'Backgrounds',
      onClick: () => { onOpenBackgrounds(); setMoreOpen(false); }
    },
    {
      icon: Settings,
      label: 'Settings',
      onClick: () => { onOpenSettings(); setMoreOpen(false); }
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t safe-area-pb z-50 md:hidden">
      <div className="flex items-center justify-around py-2 px-1">
        {primaryActions.slice(0, 4).map((action, idx) => (
          <button
            key={idx}
            onClick={action.onClick}
            className={cn(
              'flex flex-col items-center justify-center p-2 rounded-lg min-w-[60px] relative',
              'active:bg-muted transition-colors',
              action.danger && 'text-destructive',
              action.active === false && !action.danger && 'text-muted-foreground'
            )}
          >
            <div className="relative">
              <action.icon className={cn(
                'w-6 h-6',
                action.active && !action.danger && 'text-primary'
              )} />
              {action.badge && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                  {action.badge > 9 ? '9+' : action.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1">{action.label}</span>
          </button>
        ))}

        {/* More Menu */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center p-2 rounded-lg min-w-[60px] active:bg-muted transition-colors text-muted-foreground">
              <MoreHorizontal className="w-6 h-6" />
              <span className="text-[10px] mt-1">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="pb-safe">
            <SheetHeader className="text-left">
              <SheetTitle>More Options</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-4 py-6">
              {moreActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={action.onClick}
                  className={cn(
                    'flex flex-col items-center justify-center p-4 rounded-xl',
                    'bg-muted/50 active:bg-muted transition-colors',
                    action.active && 'bg-primary/10 text-primary'
                  )}
                >
                  <action.icon className="w-6 h-6 mb-2" />
                  <span className="text-xs text-center">{action.label}</span>
                </button>
              ))}
            </div>

            {/* End Call in More Menu */}
            <Button
              variant="secondary"
              className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { onEndCall(); setMoreOpen(false); }}
            >
              <PhoneOff className="w-4 h-4 mr-2" />
              Leave Meeting
            </Button>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
