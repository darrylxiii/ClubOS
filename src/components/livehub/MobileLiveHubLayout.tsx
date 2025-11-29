import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, Search, Settings } from 'lucide-react';
import VoiceChannel from './VoiceChannel';
import StageChannel from './StageChannel';
import TextChannel from './TextChannel';
import { DirectMessageView } from './DirectMessageView';
import { SearchDialog } from './SearchDialog';
import { VoiceSettingsDialog } from './VoiceSettingsDialog';
import { AdminRoleManager } from './AdminRoleManager';
import { ChannelSettingsDialog } from './ChannelSettingsDialog';
import { NotificationBell } from './NotificationBell';
import { UserStatusSelector } from './UserStatusSelector';
import LiveHubBottomNav from './LiveHubBottomNav';
import ChannelDrawer from './ChannelDrawer';
import MemberDrawer from './MemberDrawer';

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
  const [activePanel, setActivePanel] = useState<'home' | 'channels' | 'dms' | 'members' | 'settings'>('home');
  const [showChannelDrawer, setShowChannelDrawer] = useState(false);
  const [showMemberDrawer, setShowMemberDrawer] = useState(false);

  const handleChannelSelect = (channelId: string, channelType: string, shouldAutoJoin?: boolean) => {
    onChannelSelect(channelId, channelType, shouldAutoJoin);
    setShowChannelDrawer(false);
    setActivePanel('home');
  };

  const handleConversationSelect = (conversationId: string) => {
    onConversationSelect(conversationId);
    setShowChannelDrawer(false);
    setActivePanel('home');
  };

  const handleNavChange = (panel: 'home' | 'channels' | 'dms' | 'members' | 'settings') => {
    setActivePanel(panel);
    
    if (panel === 'channels' || panel === 'dms') {
      setShowChannelDrawer(true);
    } else if (panel === 'members') {
      setShowMemberDrawer(true);
    } else if (panel === 'settings') {
      setShowVoiceSettings(true);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-hidden">
      {/* Mobile Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-border bg-card shrink-0 safe-area-top">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowChannelDrawer(true)}
          className="h-10 w-10"
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="flex-1 text-center">
          <h1 className="text-lg font-semibold truncate">
            {selectedConversationId ? 'Direct Message' : 
             selectedChannelId ? 'Channel' : 
             'The Quantum Club'}
          </h1>
        </div>

        <div className="flex items-center gap-1">
          <UserStatusSelector />
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

      {/* Main Content Area - Full Screen */}
      <div className="flex-1 overflow-hidden">
        {selectedConversationId ? (
          <DirectMessageView conversationId={selectedConversationId} />
        ) : selectedChannelId ? (
          selectedChannelType === 'stage' ? (
            <StageChannel channelId={selectedChannelId} />
          ) : selectedChannelType === 'voice' || selectedChannelType === 'video' ? (
            <VoiceChannel 
              channelId={selectedChannelId}
              channelType={selectedChannelType as 'voice' | 'video'}
              autoJoin={autoJoin}
            />
          ) : (
            <TextChannel channelId={selectedChannelId} />
          )
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground px-4">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Welcome to The Quantum Club</h2>
              <p className="text-sm">Tap the menu to select a channel</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <LiveHubBottomNav activePanel={activePanel} onPanelChange={handleNavChange} />

      {/* Channel Drawer */}
      <ChannelDrawer
        open={showChannelDrawer}
        onOpenChange={setShowChannelDrawer}
        selectedChannelId={selectedChannelId}
        selectedConversationId={selectedConversationId}
        onChannelSelect={handleChannelSelect}
        onConversationSelect={handleConversationSelect}
      />

      {/* Member Drawer */}
      <MemberDrawer
        open={showMemberDrawer}
        onOpenChange={setShowMemberDrawer}
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
