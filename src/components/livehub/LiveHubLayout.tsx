import { useState } from 'react';
import ServerSidebar from './ServerSidebar';
import ChannelList from './ChannelList';
import VoiceChannel from './VoiceChannel';
import TextChannel from './TextChannel';
import MemberList from './MemberList';
import { useLiveHubPresence } from '@/hooks/useLiveHubPresence';

const LiveHubLayout = () => {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [selectedChannelType, setSelectedChannelType] = useState<string>('text');
  const { onlineMembers } = useLiveHubPresence();

  const handleChannelSelect = (channelId: string, channelType: string) => {
    setSelectedChannelId(channelId);
    setSelectedChannelType(channelType);
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
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
          selectedChannelType === 'voice' || selectedChannelType === 'video' || selectedChannelType === 'stage' ? (
            <VoiceChannel 
              channelId={selectedChannelId}
              channelType={selectedChannelType as 'voice' | 'video' | 'stage'}
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
      <MemberList onlineMembers={onlineMembers} />
    </div>
  );
};

export default LiveHubLayout;
