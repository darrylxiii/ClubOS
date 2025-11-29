import { useState } from 'react';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import ServerSidebar from './ServerSidebar';
import ChannelList from './ChannelList';
import VoiceChannel from './VoiceChannel';
import StageChannel from './StageChannel';
import TextChannel from './TextChannel';
import MemberList from './MemberList';
import { SearchDialog } from './SearchDialog';
import { NotificationBell } from './NotificationBell';
import { VoiceSettingsDialog } from './VoiceSettingsDialog';
import { AdminRoleManager } from './AdminRoleManager';
import { ChannelSettingsDialog } from './ChannelSettingsDialog';
import { DirectMessageView } from './DirectMessageView';
import { UserStatusSelector } from './UserStatusSelector';
import { useLiveHubPresence } from '@/hooks/useLiveHubPresence';
import { useUserPresenceExtended } from '@/hooks/useUserPresenceExtended';
import { Button } from '@/components/ui/button';
import { Search, Settings, Bell } from 'lucide-react';
import MobileLiveHubLayout from './MobileLiveHubLayout';

const LiveHubLayout = () => {
  const isMobile = useMobileDetection();
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [selectedChannelType, setSelectedChannelType] = useState<string>('text');
  const [autoJoin, setAutoJoin] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [connectedChannelId, setConnectedChannelId] = useState<string | null>(null);
  const [connectedChannelName, setConnectedChannelName] = useState<string>('');
  const [showSearch, setShowSearch] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [showRoleManager, setShowRoleManager] = useState(false);
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  
  // Initialize user presence
  useUserPresenceExtended();
  const { onlineMembers } = useLiveHubPresence();

  const handleChannelSelect = (channelId: string, channelType: string, shouldAutoJoin = false) => {
    setSelectedChannelId(channelId);
    setSelectedChannelType(channelType);
    setAutoJoin(shouldAutoJoin);
    setSelectedConversationId(null); // Clear DM selection
  };

  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setSelectedChannelId(null); // Clear channel selection
  };

  // Render mobile layout
  if (isMobile) {
    return (
      <MobileLiveHubLayout
        selectedChannelId={selectedChannelId}
        selectedChannelType={selectedChannelType}
        selectedConversationId={selectedConversationId}
        autoJoin={autoJoin}
        connectedChannelId={connectedChannelId}
        connectedChannelName={connectedChannelName}
        onChannelSelect={handleChannelSelect}
        onConversationSelect={handleConversationSelect}
        onConnect={(channelId, channelName) => {
          setConnectedChannelId(channelId);
          setConnectedChannelName(channelName);
        }}
        onDisconnect={() => {
          setConnectedChannelId(null);
          setConnectedChannelName('');
        }}
        onlineMembers={onlineMembers}
        showSearch={showSearch}
        setShowSearch={setShowSearch}
        showVoiceSettings={showVoiceSettings}
        setShowVoiceSettings={setShowVoiceSettings}
        showRoleManager={showRoleManager}
        setShowRoleManager={setShowRoleManager}
        showChannelSettings={showChannelSettings}
        setShowChannelSettings={setShowChannelSettings}
      />
    );
  }

  // Render desktop layout
  return (
    <div className="flex h-full bg-background text-foreground overflow-hidden">
      {/* Server Sidebar - leftmost */}
      <ServerSidebar />

      {/* Channel List - second column */}
      <ChannelList 
        selectedChannelId={selectedChannelId}
        selectedConversationId={selectedConversationId}
        connectedChannelId={connectedChannelId}
        onChannelSelect={handleChannelSelect}
        onConversationSelect={handleConversationSelect}
      />

      {/* Main Content Area - takes remaining space */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar with Search, Notifications, and Settings */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-border bg-card">
          <div className="flex items-center gap-2">
            {selectedChannelId && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowChannelSettings(true)}
                className="h-8 w-8"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <UserStatusSelector />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSearch(true)}
              className="h-8 w-8"
            >
              <Search className="h-4 w-4" />
            </Button>
            <NotificationBell />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowVoiceSettings(true)}
              className="h-8 w-8"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
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
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-2">Welcome to The Quantum Club</h2>
                <p>Select a channel or start a conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Member List - rightmost */}
      <MemberList 
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

export default LiveHubLayout;
