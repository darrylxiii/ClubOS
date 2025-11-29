import { useState } from 'react';
import ServerSidebar from './ServerSidebar';
import ChannelList from './ChannelList';
import VoiceChannel from './VoiceChannel';
import StageChannel from './StageChannel';
import TextChannel from './TextChannel';
import MemberList from './MemberList';
import { useLiveHubPresence } from '@/hooks/useLiveHubPresence';

const LiveHubLayout = () => {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [selectedChannelType, setSelectedChannelType] = useState<string>('text');
  const [autoJoin, setAutoJoin] = useState(false);
  const { onlineMembers } = useLiveHubPresence();

  const handleChannelSelect = (channelId: string, channelType: string, shouldAutoJoin = false) => {
    setSelectedChannelId(channelId);
    setSelectedChannelType(channelType);
    setAutoJoin(shouldAutoJoin);
  };

  return (
    <div className="flex h-full bg-background text-foreground overflow-hidden">
      {/* Server Sidebar - leftmost */}
      <ServerSidebar />

      {/* Channel List - second column */}
      <ChannelList 
        selectedChannelId={selectedChannelId}
        onChannelSelect={handleChannelSelect}
      />

      {/* Main Content Area - takes remaining space */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedChannelId ? (
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
              <p>Select a channel to get started</p>
            </div>
          </div>
        )}
      </div>

      {/* Member List - rightmost */}
      <MemberList 
        onlineMembers={onlineMembers}
        channelType={selectedChannelType}
        channelId={selectedChannelId}
      />
    </div>
  );
};

export default LiveHubLayout;
