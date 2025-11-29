import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, Search, Users } from 'lucide-react';
import { useSwipeable } from 'react-swipeable';
import MobileVoiceChannel from './MobileVoiceChannel';
import StageChannel from './StageChannel';
import MobileTextChannel from './MobileTextChannel';
import { DirectMessageView } from './DirectMessageView';
import { SearchDialog } from './SearchDialog';
import { VoiceSettingsDialog } from './VoiceSettingsDialog';
import { AdminRoleManager } from './AdminRoleManager';
import { ChannelSettingsDialog } from './ChannelSettingsDialog';
import { NotificationBell } from './NotificationBell';
import LiveHubBottomNav from './LiveHubBottomNav';
import MobileChannelSheet from './MobileChannelSheet';
import MobileMemberSheet from './MobileMemberSheet';

interface MobileLiveHubLayoutProps {
  selectedChannelId: string | null;
  selectedChannelType: string;
  selectedConversationId: string | null;
  autoJoin: boolean;
  onChannelSelect: (channelId: string, channelType: string, shouldAutoJoin?: boolean) => void;
  onConversationSelect: (conversationId: string) => void;
  onlineMembers: any[];
  showSearch: boolean;
  setShowSearch: (show: boolean) => void;
  showVoiceSettings: boolean;
  setShowVoiceSettings: (show: boolean) => void;
  showRoleManager: boolean;
  setShowRoleManager: (show: boolean) => void;
  showChannelSettings: boolean;
  setShowChannelSettings: (show: boolean) => void;
}

const MobileLiveHubLayout = ({
  selectedChannelId,
  selectedChannelType,
  selectedConversationId,
  autoJoin,
  onChannelSelect,
  onConversationSelect,
  onlineMembers,
  showSearch,
  setShowSearch,
  showVoiceSettings,
  setShowVoiceSettings,
  showRoleManager,
  setShowRoleManager,
  showChannelSettings,
  setShowChannelSettings,
}: MobileLiveHubLayoutProps) => {
  const [activePanel, setActivePanel] = useState<'home' | 'servers' | 'messages' | 'notifications' | 'you'>('home');
  const [showChannelSheet, setShowChannelSheet] = useState(false);
  const [showMemberSheet, setShowMemberSheet] = useState(false);

  const handleChannelSelect = (channelId: string, channelType: string, shouldAutoJoin?: boolean) => {
    onChannelSelect(channelId, channelType, shouldAutoJoin);
    setShowChannelSheet(false);
  };

  const handleConversationSelect = (conversationId: string) => {
    onConversationSelect(conversationId);
    setShowChannelSheet(false);
  };

  const handleNavChange = (panel: 'home' | 'servers' | 'messages' | 'notifications' | 'you') => {
    setActivePanel(panel);
    
    if (panel === 'servers') {
      setShowChannelSheet(true);
    } else if (panel === 'messages') {
      setShowChannelSheet(true);
    } else if (panel === 'you') {
      setShowVoiceSettings(true);
    }
  };

  // Swipe gesture handlers - Edge detection for natural navigation
  const swipeHandlers = useSwipeable({
    onSwipedRight: (eventData) => {
      // Only open from edge (left 50px of screen)
      if (eventData.initial[0] < 50) {
        setShowChannelSheet(true);
        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(30);
      }
    },
    onSwipedLeft: (eventData) => {
      // Only open from edge (right 50px of screen)
      if (eventData.initial[0] > window.innerWidth - 50) {
        setShowMemberSheet(true);
        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(30);
      }
    },
    trackMouse: false,
    trackTouch: true,
    preventScrollOnSwipe: false,
  });

  // Get contextual header title
  const getHeaderTitle = () => {
    if (selectedConversationId) return 'Direct Message';
    if (selectedChannelId) return 'Channel';
    return 'The Quantum Club';
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-hidden" {...swipeHandlers}>
      {/* Unified Contextual Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-border bg-card shrink-0 safe-area-top">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowChannelSheet(true)}
          className="h-10 w-10"
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="flex-1 text-center">
          <h1 className="text-lg font-semibold truncate">
            {getHeaderTitle()}
          </h1>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowMemberSheet(true)}
            className="h-10 w-10"
          >
            <Users className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSearch(true)}
            className="h-10 w-10"
          >
            <Search className="h-5 w-5" />
          </Button>
          <NotificationBell />
        </div>
      </div>

      {/* Main Content Area - Headless (no internal headers) */}
      <div className="flex-1 overflow-hidden">
        {selectedConversationId ? (
          <DirectMessageView conversationId={selectedConversationId} />
        ) : selectedChannelId ? (
          selectedChannelType === 'stage' ? (
            <StageChannel channelId={selectedChannelId} />
          ) : selectedChannelType === 'voice' || selectedChannelType === 'video' ? (
            <MobileVoiceChannel 
              channelId={selectedChannelId}
              channelType={selectedChannelType as 'voice' | 'video'}
              autoJoin={autoJoin}
            />
          ) : (
            <MobileTextChannel channelId={selectedChannelId} />
          )
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground px-4">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Welcome to The Quantum Club</h2>
              <p className="text-sm">Swipe right or tap menu to select a channel</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation - Discord-style 4 items */}
      <LiveHubBottomNav activePanel={activePanel} onPanelChange={handleNavChange} />

      {/* Side Sheets */}
      <MobileChannelSheet
        open={showChannelSheet}
        onOpenChange={setShowChannelSheet}
        selectedChannelId={selectedChannelId}
        selectedConversationId={selectedConversationId}
        onChannelSelect={handleChannelSelect}
        onConversationSelect={handleConversationSelect}
      />

      <MobileMemberSheet
        open={showMemberSheet}
        onOpenChange={setShowMemberSheet}
        onlineMembers={onlineMembers}
        channelType={selectedChannelType}
        channelId={selectedChannelId}
      />

      {/* Dialogs */}
      <SearchDialog 
        open={showSearch} 
        onOpenChange={setShowSearch}
        onChannelSelect={handleChannelSelect}
      />
      <VoiceSettingsDialog 
        open={showVoiceSettings} 
        onOpenChange={setShowVoiceSettings} 
      />
      <AdminRoleManager 
        open={showRoleManager} 
        onOpenChange={setShowRoleManager} 
      />
      <ChannelSettingsDialog 
        open={showChannelSettings} 
        onOpenChange={setShowChannelSettings}
        channelId={selectedChannelId}
      />
    </div>
  );
};

export default MobileLiveHubLayout;
